import is, {TypeName} from '@sindresorhus/is';
import {assertType, isBrowser, shallowEqual} from './utils';
import {Cache, CacheItem, SerializableCacheItem, reduce} from './Cache';

const DEFAULT_THROTTLE_MS = 150;

export enum STATUS {
    PENDING,
    FULFILLED,
    REJECTED,
}

export type MemoizedKey = Readonly<Record<string, unknown>>;

export interface MemoizedValue<DataType> {
    status: STATUS;
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
        if (!filterFulfilled || status === STATUS.FULFILLED) {
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
            `usePriem: A resource with '${duplicateSsrKey}' \`ssrKey\` already exists. Please make sure \`ssrKey\`s are unique.`,
        );
    }

    return store;
}

/** @internal */
export function getRunningPromises() {
    const promises: Promise<unknown>[] = [];

    for (const resource of resourceList) {
        // all resources in resourceList have ssrKeys
        /* istanbul ignore next */
        if (resource.ssrKey) {
            reduce<void, MemoizedKey, MemoizedValue<unknown>>(resource.cache, undefined, (_, cacheItem) => {
                const {status, promise} = cacheItem.value;
                if (status === STATUS.PENDING && promise) {
                    promises.push(promise);
                }
            });
        }
    }

    return promises;
}

let hydratedCacheMap = new Map<string, MemoizedSerializableCacheItem[]>();
export function hydrateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void {
    assertType(initialStore, [TypeName.Array], "'initialStore'");
    hydratedCacheMap = new Map(initialStore);
}

export interface Subscriber<Args> {
    onChange: (prevArgs: Args, forceRefresh: boolean) => void;
}

export interface ResourceOptions {
    maxSize?: number;
    ssrKey?: string;
}

export interface ReadOptions {
    forceRefresh: boolean;
    maxAge?: number;
}

export class Resource<DataType, Args extends Record<string, unknown>> {
    private readonly listeners: Subscriber<Args>[] = [];
    /** @private */ readonly cache: Cache<Args, MemoizedValue<DataType>>;
    private readonly fn: (args: Readonly<Args>) => Promise<DataType>;
    private readonly maxSize: number;
    /** @private */ readonly ssrKey?: string;

    constructor(fn: (args: Readonly<Args>) => Promise<DataType>, options: ResourceOptions) {
        assertType(fn, [TypeName.Function], "'fn'");
        assertType(options, [TypeName.Object], "Resource argument 'options'");

        const {maxSize, ssrKey} = options;

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
        this.maxSize = is.number(maxSize) && maxSize > 0 && is.safeInteger(maxSize) ? maxSize : 1;
        this.ssrKey = ssrKey;
    }

    has(args: Args | undefined): boolean {
        if (args === undefined) {
            return false;
        }
        return !!this.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args));
    }

    read(args: Args | undefined, options: ReadOptions): MemoizedValue<DataType> | undefined {
        if (args === undefined) {
            return;
        }

        if (!isBrowser) {
            // Do not run on server when no ssrKey
            if (!this.ssrKey) {
                return;
            }
            resourceList.add(this);
        }

        let item = this.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args));
        let shouldRefresh = false;

        if (!item) {
            if (this.cache.size >= this.maxSize) {
                const itemToRemove = this.cache.tail;
                this.cache.remove(itemToRemove!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
                itemToRemove!.destroy(); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }

            item = new CacheItem<Args, MemoizedValue<DataType>>(args, {
                status: STATUS.PENDING,
                data: undefined,
                reason: undefined,
            });
            this.cache.prepend(item);
            shouldRefresh = true;
        } else {
            if (item !== this.cache.head && this.cache.remove(item)) {
                this.cache.prepend(item);
            }

            if (options.forceRefresh) {
                shouldRefresh = true;
            }
        }

        if (shouldRefresh) {
            // Throttle refreshes
            const now = Date.now();
            const lastRefreshAt = item.lastRefreshAt || 0;

            if (now - lastRefreshAt > DEFAULT_THROTTLE_MS) {
                item.lastRefreshAt = now;

                const maxAge = is.number(options.maxAge) && isFinite(options.maxAge) ? options.maxAge : undefined;

                if (isBrowser && maxAge) {
                    window.clearTimeout(item.expireId);
                    const itemKey = item.key;
                    item.expireId = window.setTimeout(() => {
                        this.onCacheChange(itemKey, true);
                    }, maxAge);
                }

                const itemValue = Object.assign(item.value, {status: STATUS.PENDING, reason: undefined});
                itemValue.promise = this.fn(args)
                    .then(data => {
                        Object.assign(itemValue, {status: STATUS.FULFILLED, data, reason: undefined});
                        this.onCacheChange(args, false);
                    })
                    .catch(error => {
                        Object.assign(itemValue, {status: STATUS.REJECTED, data: undefined, reason: error});
                        this.onCacheChange(args, false);
                    });
            }
        }

        return item.value;
    }

    /** @private */
    onCacheChange(args: Args, forceRefresh: boolean): void {
        this.listeners.forEach(comp => {
            comp.onChange(args, forceRefresh);
        });
    }

    subscribe(component: Subscriber<Args>): void {
        // TODO: Handle cases when the same component subscribes multiple times?
        this.listeners.push(component);
    }

    unsubscribe(component: Subscriber<Args>): void {
        const index = this.listeners.findIndex(copm => copm === component);
        this.listeners.splice(index, 1);
    }
}
