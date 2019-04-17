import is from '@sindresorhus/is';
import {Cache, CacheItem, reduce, SerializableCacheItem} from './Cache';
import {areKeysEqual, isBrowser, noop} from './utils';

const DEFAULT_THROTTLE_MS = 150;

export enum STATUS {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2,
}

export type MemoizedKey = readonly unknown[];

export interface MemoizedValue<DataType = unknown> {
    status: STATUS;
    data: DataType | null;
    reason?: Error;
    promise?: Promise<void>;
}

export type MemoizedCache<Args extends MemoizedKey = MemoizedKey, DataType = unknown> = Cache<
    Args,
    MemoizedValue<DataType>
>;
export type MemoizedCacheItem<Args extends MemoizedKey = MemoizedKey, DataType = unknown> = CacheItem<
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
    return reduce<MemoizedSerializableCacheItem[], MemoizedKey, MemoizedValue>(cache, [], (acc, item) => {
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

export type CacheChangeCallback<Args> = (key: Args, forceUpdate: boolean) => void;

interface MemoizeOptions<Args extends MemoizedKey, DataType> {
    fn: (...args: Args) => Promise<DataType>;
    initialCache?: (MemoizedSerializableCacheItem<Args, DataType> | MemoizedCacheItem<Args, DataType>)[];
    maxSize?: number;
    maxAge?: number;
    onCacheChange?: CacheChangeCallback<Args>;
}

export class MemoizedFunction<Args extends MemoizedKey, DataType> {
    readonly cache: Cache<Args, MemoizedValue<DataType>>;
    private readonly fn: (...args: Args) => Promise<DataType>;
    private readonly maxSize: number;
    private readonly maxAge?: number;
    private readonly onCacheChange: CacheChangeCallback<Args>;

    constructor(options: MemoizeOptions<Args, DataType>) {
        const {fn, initialCache = [], maxSize = 1, maxAge, onCacheChange = noop} = options;

        this.cache = new Cache<Args, MemoizedValue<DataType>>(initialCache);

        this.fn = fn;
        this.maxSize = maxSize;
        this.maxAge = is.number(maxAge) && isFinite(maxAge) ? maxAge : undefined;
        this.onCacheChange = onCacheChange;
    }

    run(args: Args, forceRefresh: boolean = false): MemoizedValue<DataType> {
        let item = this.cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
        let shouldRefresh = false;

        if (item === null) {
            if (this.cache.size >= this.maxSize) {
                const itemToRemove = this.cache.tail;
                this.cache.remove(itemToRemove);
                if (itemToRemove) {
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
}
