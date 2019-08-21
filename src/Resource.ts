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

// Only used during SSR for resources with `ssrKey`
export const resourceList: Resource<unknown, any>[] = [];

function toSerializableArray(
    cache: Cache<MemoizedKey, MemoizedValue<unknown>>,
    filterFulfilled = false
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

export function flushStore(): [string, MemoizedSerializableCacheItem[]][] {
    const store: [string, MemoizedSerializableCacheItem[]][] = [];

    for (const resource of resourceList) {
        if (resource.ssrKey) {
            store.push([resource.ssrKey, toSerializableArray(resource.cache, true)]);
        }
    }

    // TODO: should flushing clear resources?

    return store;
}

/** @internal */
export function getRunningPromises() {
    return resourceList.reduce<Promise<unknown>[]>((acc, resource) => {
        if (resource.ssrKey) {
            reduce<void, MemoizedKey, MemoizedValue<unknown>>(resource.cache, undefined, (_, cacheItem) => {
                const {status, promise} = cacheItem.value;
                if (status === STATUS.PENDING && promise) {
                    acc.push(promise);
                }
            });
        }
        return acc;
    }, []);
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
    maxAge?: number;
    ssrKey?: string;
}

// TODO: introduce a mechanism to dispose unneeded resource?
export class Resource<DataType, Args extends Record<string, unknown>> {
    private readonly listeners: Subscriber<Args>[] = [];
    /** @private */ readonly cache: Cache<Args, MemoizedValue<DataType>>;
    private readonly fn: (args: Readonly<Args>) => Promise<DataType>;
    private readonly maxSize: number;
    private readonly maxAge?: number;
    /** @private */ readonly ssrKey?: string;

    constructor(fn: (args: Readonly<Args>) => Promise<DataType>, options: ResourceOptions) {
        assertType(fn, [TypeName.Function], "'fn'");
        assertType(options, [TypeName.Object], "Resource argument 'options'");

        const {maxSize, maxAge, ssrKey} = options;

        assertType(ssrKey, [TypeName.string, TypeName.undefined], "'ssrKey'");

        if (!isBrowser && ssrKey) {
            resourceList.push(this);
        }

        let initialCache: (MemoizedSerializableCacheItem<Args, DataType>)[] = [];
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
        this.maxAge = is.number(maxAge) && isFinite(maxAge) ? maxAge : undefined;
        this.ssrKey = ssrKey;

        this.onCacheChange = this.onCacheChange.bind(this);
    }

    /** @private */
    run(args: Args, forceRefresh = false): MemoizedValue<DataType> {
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

            if (forceRefresh) {
                shouldRefresh = true;
            }
        }

        if (shouldRefresh) {
            // Throttle refreshes
            const now = Date.now();
            const lastRefreshAt = item.lastRefreshAt || 0;
            if (now - lastRefreshAt > DEFAULT_THROTTLE_MS) {
                item.lastRefreshAt = now;

                if (isBrowser && this.maxAge) {
                    window.clearTimeout(item.expireId);
                    const itemKey = item.key;
                    item.expireId = window.setTimeout(() => {
                        this.onCacheChange(itemKey, true);
                    }, this.maxAge);
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

    has(args: Args | null): boolean {
        if (args === null) {
            return false;
        }
        return !!this.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args));
    }

    get(args: Args | null, forceRefresh = false): MemoizedValue<DataType> | undefined {
        if (args === null) {
            return;
        }

        if (!isBrowser && !this.ssrKey) {
            return;
        }

        return this.run(args, forceRefresh);
    }

    // remove(args: Args): void {
    //     this.memoized.has(args);
    // }

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
