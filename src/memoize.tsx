import {Cache, CacheItem, SerializableCacheItem, reduce} from './Cache';
import {type, isBrowser, noop, areKeysEqual} from './utils';

const DEFAULT_THROTTLE_MS = 150;

export enum STATUS {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2,
}

// TODO: replace with readonly once api-extractor supports it
export type MemoizedKey = /** @readonly */ unknown[];

export interface MemoizedValue {
    status: STATUS;
    data: unknown;
    reason?: Error;
    promise?: Promise<void>;
}

export type MemoizedCache = Cache<MemoizedKey, MemoizedValue>;

export type MemoizedCacheItem = CacheItem<MemoizedKey, MemoizedValue>;

export type MemoizedSerializableCacheItem = SerializableCacheItem<MemoizedKey, MemoizedValue>;

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

export type CacheChangeCallback = (key: MemoizedKey, forceUpdate: boolean) => void;

function createTimeout(
    cache: MemoizedCache,
    item: MemoizedCacheItem,
    onCacheChange: CacheChangeCallback,
    maxAge?: number
): void {
    if (isBrowser && maxAge) {
        window.clearTimeout(item.expireId);
        item.expireId = window.setTimeout(() => {
            onCacheChange(item.key, true);
        }, maxAge);
    }
}

interface MemoizeOptions<Args extends MemoizedKey> {
    fn: (...args: Args) => Promise<unknown>;
    initialCache?: (MemoizedSerializableCacheItem | MemoizedCacheItem)[];
    maxSize?: number;
    maxAge?: number;
    onCacheChange?: CacheChangeCallback;
}

export interface MemoizedFunction {
    (args: MemoizedKey, forceRefresh?: boolean): MemoizedValue;

    cache: MemoizedCache;
    has: (args: MemoizedKey) => boolean;
}

export default function memoize<Args extends MemoizedKey>({
    fn,
    initialCache = [],
    maxSize = 1,
    maxAge = Infinity,
    onCacheChange = noop,
}: MemoizeOptions<Args>): MemoizedFunction {
    const cache: MemoizedCache = new Cache(initialCache);
    const normalizeMaxAge = type(maxAge) === 'number' && isFinite(maxAge) ? maxAge : undefined;

    function memoized(args: Args, forceRefresh: boolean = false): MemoizedValue {
        let item: MemoizedCacheItem | null = cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
        let shouldRefresh = false;

        if (item === null) {
            if (cache.size >= maxSize) {
                const itemToRemove = cache.tail;
                cache.remove(itemToRemove);
                if (itemToRemove) {
                    itemToRemove.destroy();
                }
            }

            item = new CacheItem<Args, MemoizedValue>(args, {status: STATUS.PENDING, data: null, reason: undefined});
            cache.prepend(item);
            shouldRefresh = true;
        } else {
            if (item !== cache.head && cache.remove(item) !== null) {
                cache.prepend(item);
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
                createTimeout(cache, item, onCacheChange, normalizeMaxAge);
                const itemValue = Object.assign(item.value, {status: STATUS.PENDING, reason: undefined});
                itemValue.promise = fn(...args)
                    .then(data => {
                        Object.assign(itemValue, {status: STATUS.FULFILLED, data, reason: undefined});
                        onCacheChange(args, false);
                    })
                    .catch(error => {
                        Object.assign(itemValue, {status: STATUS.REJECTED, data: null, reason: error});
                        onCacheChange(args, false);
                    });
            }
        }

        return item.value;
    }

    Object.defineProperties(memoized, {
        cache: {
            value: cache,
        },
        has: {
            value: function has(args: MemoizedKey) {
                return !!cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
            },
        },
    });

    // @ts-ignore
    return memoized;
}
