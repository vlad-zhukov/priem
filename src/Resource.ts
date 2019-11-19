import is, {TypeName} from '@sindresorhus/is';
import {assertType, isBrowser, shallowEqual} from './utils';
import {Cache, CacheItem, SerializableCacheItem, reduce} from './Cache';

const DEFAULT_MAX_SIZE = 50;

export enum Status {
    PENDING,
    FULFILLED,
    REJECTED,
}

export type MemoizedKey = Readonly<Record<string, unknown>>;

export interface MemoizedValue<DataType> {
    status: Status;
    data: DataType | undefined;
    reason?: Error;
    promise?: Promise<void>;
}

export type MemoizedSerializableCacheItem<
    Args extends MemoizedKey = MemoizedKey,
    DataType = unknown
> = SerializableCacheItem<Args, MemoizedValue<DataType>>;

export function toSerializableArray(
    cache: Cache<MemoizedKey, MemoizedValue<unknown>>,
    filterFulfilled = false,
): MemoizedSerializableCacheItem[] {
    return reduce<MemoizedSerializableCacheItem[], MemoizedKey, MemoizedValue<unknown>>(cache, [], (acc, item) => {
        const {status, data, reason} = item.value;
        if (!filterFulfilled || status === Status.FULFILLED) {
            acc.push({
                key: item.key,
                value: {status, data, reason},
            });
        }
        return acc;
    });
}

// Only used during SSR for resources with `ssrKey`
const resourceList = new Set<Resource<unknown, any>>();

export function flushStore(): [string, MemoizedSerializableCacheItem[]][] {
    const store: [string, MemoizedSerializableCacheItem[]][] = [];
    const seenSsrKeys = new Set<string>();
    let duplicateSsrKey: string | undefined;

    for (const resource of resourceList) {
        const {ssrKey, cache} = resource;
        // all resources in resourceList have ssrKeys
        /* istanbul ignore next */
        if (ssrKey) {
            if (seenSsrKeys.has(ssrKey)) {
                duplicateSsrKey = ssrKey;
            }

            // Stop serializing other caches because we will throw anyway
            if (!duplicateSsrKey) {
                seenSsrKeys.add(ssrKey);
                store.push([ssrKey, toSerializableArray(cache, true)]);
            }

            // Always clear all caches
            reduce(cache, undefined, (acc, cacheItem) => {
                cache.remove(cacheItem);
                cacheItem.destroy();
                return undefined;
            });
        }
    }

    resourceList.clear();

    if (duplicateSsrKey) {
        throw new Error(
            `useResource: A resource with '${duplicateSsrKey}' \`ssrKey\` already exists. Please make sure \`ssrKey\`s are unique.`,
        );
    }

    return store;
}

/** @internal */
export function getRunningPromises() {
    const promises: Promise<unknown>[] = [];

    for (const resource of resourceList) {
        // all resources in resourceList have ssrKeys
        reduce<void, MemoizedKey, MemoizedValue<unknown>>(resource.cache, undefined, (_, cacheItem) => {
            const {status, promise} = cacheItem.value;
            if (status === Status.PENDING && promise) {
                promises.push(promise);
            }
        });
    }

    return promises;
}

let hydratedCacheMap = new Map<string, MemoizedSerializableCacheItem[]>();
export function hydrateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void {
    assertType(initialStore, [TypeName.Array], "'initialStore'");
    hydratedCacheMap = new Map(initialStore);
}

export interface Subscriber<Args> {
    onChange: (prevArgs: Args, shouldCommit: boolean) => boolean;
}

export interface ResourceOptions {
    ssrKey?: string;
}

export interface ReadOptions {
    maxAge?: number;
}

export class Resource<DataType, Args extends Record<string, unknown>> {
    private readonly listeners: Subscriber<Args>[] = [];
    /** @private */ readonly cache: Cache<Args, MemoizedValue<DataType>>;
    private readonly fn: (args: Readonly<Args>) => Promise<DataType>;
    /** @private */ readonly ssrKey?: string;

    constructor(fn: (args: Readonly<Args>) => Promise<DataType>, options: ResourceOptions = {}) {
        assertType(fn, [TypeName.Function], "'fn'");
        assertType(options, [TypeName.Object], "Resource argument 'options'");

        const {ssrKey} = options;

        assertType(ssrKey, [TypeName.string, TypeName.undefined], "'ssrKey'");

        let initialCache: MemoizedSerializableCacheItem<Args, DataType>[] = [];
        if (ssrKey) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            initialCache = hydratedCacheMap.get(ssrKey) || [];
            hydratedCacheMap.delete(ssrKey);
        }

        this.listeners = [];
        this.cache = new Cache<Args, MemoizedValue<DataType>>(initialCache);
        this.fn = fn;
        this.ssrKey = ssrKey;

        if (!isBrowser) {
            resourceList.add(this);
        }
    }

    has(args: Args): boolean {
        return !!this.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args));
    }

    read(args: Args, options: ReadOptions): MemoizedValue<DataType> | undefined {
        // Do not run on server when no ssrKey
        if (!isBrowser && !this.ssrKey) {
            return;
        }

        let item = this.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args));
        let isNewItem = false;

        if (item) {
            // Move item to head
            if (item !== this.cache.head && this.cache.remove(item)) {
                this.cache.prepend(item);
            }
        } else {
            // Remove the oldest item if cache size is bigger than default max size
            if (this.cache.size >= DEFAULT_MAX_SIZE && this.cache.tail) {
                this.invalidate(this.cache.tail.key, false);
            }

            item = new CacheItem<Args, MemoizedValue<DataType>>(args, {
                status: Status.PENDING,
                data: undefined,
                reason: undefined,
            });
            this.cache.prepend(item);
            isNewItem = true;
        }

        const maxAge = is.safeInteger(options.maxAge) ? options.maxAge : undefined;
        const isOutdated = !maxAge ? false : Date.now() - (item.lastUpdateAt || 0) > maxAge;
        const shouldUpdate =
            isNewItem ||
            (!item.isValid && item.value.status !== Status.PENDING) ||
            (isOutdated && item.value.status === Status.FULFILLED);

        if (shouldUpdate) {
            this.update(item, maxAge);
        } else if (!item.expireTimerId && isBrowser && maxAge) {
            item.expireTimerId = window.setTimeout(() => {
                if (item && item.key) {
                    this.invalidate(item.key);
                }
            }, maxAge);
        }

        return item.value;
    }

    delete(args: Args): void {
        const item = this.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args));
        if (item) {
            this.cache.remove(item);
            item.destroy();
        }
    }

    invalidate(args: Args, shouldCommit = true): void {
        const item = this.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args));
        if (item) {
            const timesUsed = this.onCacheChange(args, shouldCommit);

            if (timesUsed > 0) {
                window.clearTimeout(item.expireTimerId);
                item.isValid = false; // This will trigger an update
            } else {
                this.cache.remove(item);
                item.destroy();
            }
        }
    }

    /** @private */
    update(item: CacheItem<Args, MemoizedValue<DataType>>, maxAge?: number): void {
        Object.assign(item.value, {status: Status.PENDING, data: undefined, reason: undefined});

        const promise = this.fn(item.key)
            .then(data => {
                if (!item.key) {
                    return;
                }

                Object.assign(item.value, {status: Status.FULFILLED, data, reason: undefined});
                item.isValid = true;
                item.lastUpdateAt = Date.now();

                const timesUsed = this.onCacheChange(item.key);

                if (timesUsed > 0 && isBrowser && maxAge) {
                    window.clearTimeout(item.expireTimerId);
                    item.expireTimerId = window.setTimeout(() => {
                        if (item.key) {
                            this.invalidate(item.key);
                        }
                    }, maxAge);
                }
            })
            .catch(error => {
                if (!item.key) {
                    return;
                }

                Object.assign(item.value, {status: Status.REJECTED, data: undefined, reason: error});
                item.isValid = true;
                item.lastUpdateAt = Date.now();

                this.onCacheChange(item.key);
            });

        if (!isBrowser && this.ssrKey) {
            item.value.promise = promise;
        }
    }

    /** @private */
    onCacheChange(args: Args, shouldCommit = true): number {
        let timesUsed = 0;
        this.listeners.forEach(comp => {
            if (comp.onChange(args, shouldCommit)) {
                timesUsed += 1;
            }
        });
        return timesUsed;
    }

    subscribe(component: Subscriber<Args>): void {
        // TODO: Handle cases when the same component subscribes multiple times?
        this.listeners.push(component);
    }

    unsubscribe(component: Subscriber<Args>): void {
        const index = this.listeners.findIndex(comp => comp === component);
        this.listeners.splice(index, 1);
    }
}
