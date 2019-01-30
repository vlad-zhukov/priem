import {Cache, CacheItem, SerializableCacheItem, reduce} from './Cache';
import {type, isBrowser, noop} from './helpers';

const DEFAULT_THROTTLE_MS = 150;

export enum STATUS {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2,
}

export type MemoizedKey = unknown[];

export type MemoizedValue = {
    status: STATUS;
    data: unknown;
    reason: Error | null;
    promise?: Promise<void>;
};

export type MemoizedCache = Cache<MemoizedKey, MemoizedValue>;

export type MemoizedCacheItem = CacheItem<MemoizedKey, MemoizedValue>;

export type MemoizedSerializableCacheItem = SerializableCacheItem<MemoizedKey, MemoizedValue>;

function isSameValueZero(object1: unknown, object2: unknown): boolean {
    return object1 === object2 || (object1 !== object1 && object2 !== object2);
}

export function areKeysEqual(keys1: MemoizedKey, keys2: MemoizedKey): boolean {
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (let i = 0; i < keys1.length; i++) {
        if (isSameValueZero(keys1[i], keys2[i]) === false) {
            return false;
        }
    }
    return true;
}

export function toSerializableArray(
    cache: MemoizedCache,
    filterFulfilled: boolean = false
): MemoizedSerializableCacheItem[] {
    return reduce<MemoizedSerializableCacheItem[], MemoizedKey, MemoizedValue>(cache, [], (acc, item) => {
        const {status, data, reason} = item.value;
        if (filterFulfilled !== true || status === STATUS.FULFILLED) {
            acc.push({
                key: item.key,
                value: {status, data, reason},
            });
        }
        return acc;
    });
}

export type cacheChangeCallback = (key: MemoizedKey, forceUpdate: boolean) => void;

function createTimeout(
    cache: MemoizedCache,
    item: MemoizedCacheItem,
    maxAge: number | null,
    onCacheChange: cacheChangeCallback
): void {
    if (isBrowser === true && maxAge !== null) {
        clearTimeout(item.expireId);
        // eslint-disable-next-line no-param-reassign
        // @ts-ignore
        item.expireId = setTimeout(() => {
            onCacheChange(item.key, true);
        }, maxAge);
    }
}

type MemoizeOptions = {
    fn: (...args: MemoizedKey) => Promise<unknown>;
    initialCache?: (MemoizedSerializableCacheItem | MemoizedCacheItem)[];
    maxSize?: number;
    maxAge?: number;
    onCacheChange?: cacheChangeCallback;
};

export type MemoizedFunction = {
    (args: MemoizedKey, forceRefresh?: boolean): MemoizedValue;
    cache: MemoizedCache;
    has: (args: MemoizedKey) => boolean;
};

export default function memoize({
    fn,
    initialCache = [],
    maxSize = 1,
    maxAge = Infinity,
    onCacheChange = noop,
}: MemoizeOptions): MemoizedFunction {
    const cache: MemoizedCache = new Cache(initialCache);
    const normalizeMaxAge = type(maxAge) === 'number' && isFinite(maxAge) ? maxAge : null;

    function memoized(args: MemoizedKey, forceRefresh: boolean = false): MemoizedValue {
        let item: MemoizedCacheItem | null = cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
        let shouldRefresh = false;

        if (item === null) {
            if (cache.size >= maxSize) {
                const itemToRemove = cache.tail;
                cache.remove(itemToRemove);
                itemToRemove!.destroy();
            }

            item = new CacheItem(args, {status: STATUS.PENDING, data: null, reason: null});
            cache.prepend(item);
            shouldRefresh = true;
        } else {
            if (item !== cache.head && cache.remove(item) !== null) {
                cache.prepend(item);
            }

            if (forceRefresh === true) {
                shouldRefresh = true;
            }
        }

        if (shouldRefresh) {
            // Throttle refreshes
            const now = Date.now();
            const lastRefreshAt = item.lastRefreshAt || 0;
            if (now - lastRefreshAt > DEFAULT_THROTTLE_MS) {
                item.lastRefreshAt = now;
                createTimeout(cache, item, normalizeMaxAge, onCacheChange);
                const itemValue = Object.assign(item.value, {status: STATUS.PENDING, reason: null});
                itemValue.promise = fn(...args)
                    .then(data => {
                        Object.assign(itemValue, {status: STATUS.FULFILLED, data, reason: null});
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
