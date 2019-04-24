import is, {TypeName} from '@sindresorhus/is';
import {areKeysEqual, assertType, isBrowser} from './utils';
import {Cache, CacheItem, reduce, SerializableCacheItem} from './Cache';

const DEFAULT_THROTTLE_MS = 150;

export enum STATUS {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2,
}

export type MemoizedKey = readonly unknown[];

export interface MemoizedValue<DataType> {
    status: STATUS;
    data: DataType | null;
    reason?: Error;
    promise?: Promise<void>;
}

type MemoizedCache<Args extends MemoizedKey = MemoizedKey, DataType = unknown> = Cache<Args, MemoizedValue<DataType>>;
type MemoizedCacheItem<Args extends MemoizedKey = MemoizedKey, DataType = unknown> = CacheItem<
    Args,
    MemoizedValue<DataType>
>;
export type MemoizedSerializableCacheItem<
    Args extends MemoizedKey = MemoizedKey,
    DataType = unknown
> = SerializableCacheItem<Args, MemoizedValue<DataType>>;

export function toSerializableArray(
    cache: MemoizedCache,
    filterFulfilled: boolean = false
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

let storeMap = new Map<string, MemoizedSerializableCacheItem[] | MemoizedCacheItem[] | MemoizedCache>();
export const renderPromises: (Promise<void>)[] = [];

export function populateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void {
    assertType(initialStore, [TypeName.Array], "'initialStore'");
    storeMap = new Map(initialStore);
}

function isSerializableCache(
    maybeCache: MemoizedSerializableCacheItem[] | MemoizedCache
): maybeCache is MemoizedSerializableCacheItem[] {
    return is.array(maybeCache);
}

export function flushStore(): [string, MemoizedSerializableCacheItem[]][] {
    const store: [string, MemoizedSerializableCacheItem[]][] = [];
    for (const [ssrKey, maybeCache] of storeMap.entries()) {
        const value = isSerializableCache(maybeCache) ? maybeCache : toSerializableArray(maybeCache, true);
        store.push([ssrKey, value]);
    }

    storeMap.clear(); // TODO: should flushing clear resources?
    renderPromises.splice(0);
    return store;
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
export class Resource<Args extends MemoizedKey, DataType> {
    private readonly listeners: Subscriber<Args>[] = [];
    private readonly cache: Cache<Args, MemoizedValue<DataType>>;
    private readonly fn: (...args: Args) => Promise<DataType>;
    private readonly maxSize: number;
    private readonly maxAge?: number;
    private readonly ssrKey?: string;

    constructor(fn: (...args: Args) => Promise<DataType>, options: ResourceOptions) {
        assertType(fn, [TypeName.Function], "'fn'");
        assertType(options, [TypeName.Object], "Resource argument 'options'");

        const {maxSize = 1, maxAge, ssrKey} = options;

        assertType(ssrKey, [TypeName.string, TypeName.undefined], "'ssrKey'");

        let initialCache: (MemoizedSerializableCacheItem<Args, DataType> | MemoizedCacheItem<Args, DataType>)[] = [];
        if (ssrKey) {
            // @ts-ignore
            initialCache = storeMap.get(ssrKey) || [];
            storeMap.delete(ssrKey);
        }

        this.listeners = [];
        this.cache = new Cache<Args, MemoizedValue<DataType>>(initialCache);
        this.fn = fn;
        this.maxSize = maxSize;
        this.maxAge = is.number(maxAge) && isFinite(maxAge) ? maxAge : undefined;
        this.ssrKey = ssrKey;

        this.onCacheChange = this.onCacheChange.bind(this);
    }

    /** @private */
    run(args: Args, forceRefresh: boolean = false): MemoizedValue<DataType> {
        let item = this.cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
        let shouldRefresh = false;

        if (item === null) {
            if (this.cache.size >= this.maxSize) {
                const itemToRemove = this.cache.tail;
                if (itemToRemove) {
                    this.cache.remove(itemToRemove);
                    itemToRemove.destroy();
                }
            }

            item = new CacheItem<Args, MemoizedValue<DataType>>(args, {
                status: STATUS.PENDING,
                data: null,
                reason: undefined,
            });
            this.cache.prepend(item);
            shouldRefresh = true;
        } else {
            if (item !== this.cache.head && this.cache.remove(item) !== null) {
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
                itemValue.promise = this.fn(...args)
                    .then(data => {
                        Object.assign(itemValue, {status: STATUS.FULFILLED, data, reason: undefined});
                        this.onCacheChange(args, false);
                    })
                    .catch(error => {
                        Object.assign(itemValue, {status: STATUS.REJECTED, data: null, reason: error});
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
        return !!this.cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
    }

    get(args: Args | null, forceRefresh: boolean = false): MemoizedValue<DataType> | undefined {
        if (args === null) {
            return;
        }

        if (!isBrowser && !this.ssrKey) {
            return;
        }

        const ret = this.run(args, forceRefresh);

        if (!isBrowser && this.ssrKey) {
            const cache = storeMap.get(this.ssrKey);
            if (cache !== undefined && cache !== this.cache) {
                throw new TypeError(
                    `usePriem: A resource with '${this.ssrKey}' \`ssrKey\` already exists. ` +
                        'Please make sure `ssrKey`s are unique.'
                );
            } else {
                storeMap.set(this.ssrKey, this.cache);
            }
            if (ret.status === STATUS.PENDING && ret.promise) {
                renderPromises.push(ret.promise);
            }
        }

        return ret;
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
