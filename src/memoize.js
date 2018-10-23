import {Cache, CacheItem, reduce} from './Cache';
import {type, isBrowser} from './helpers';

const noop = () => true;

export const PENDING = 0;
export const FULFILLED = 1;
export const REJECTED = 2;

function isSameValueZero(object1, object2) {
    // eslint-disable-next-line no-self-compare
    return object1 === object2 || (object1 !== object1 && object2 !== object2);
}

export function areKeysEqual(keys1, keys2) {
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

export function toSerializableArray(cache, filterFulfilled = false) {
    return reduce(cache, [], (acc, item) => {
        const {status, data, reason} = item.value;
        if (filterFulfilled !== true || status === FULFILLED) {
            acc.push({
                key: item.key,
                value: {status, data, reason},
            });
        }
        return acc;
    });
}

function createTimeout(cache, item, maxAge, onCacheChange) {
    if (isBrowser === true && maxAge !== null) {
        clearTimeout(item.expireId);
        // eslint-disable-next-line no-param-reassign
        item.expireId = setTimeout(() => {
            onCacheChange(item.key, true);
        }, maxAge);
    }
}

export default function memoize({fn, initialCache = [], maxSize = 1, maxAge = Infinity, onCacheChange = noop}) {
    const cache = new Cache(initialCache);
    // eslint-disable-next-line no-restricted-globals
    const normalizeMaxAge = type(maxAge) === 'number' && isFinite(maxAge) ? maxAge : null;

    function memoized(args, forceRefresh) {
        let item = cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
        let shouldRefresh = false;

        if (item === null) {
            if (cache.size >= maxSize) {
                const itemToRemove = cache.tail;
                cache.remove(itemToRemove);
                itemToRemove.destroy();
            }

            item = new CacheItem(args, {status: PENDING, data: null, reason: null});
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
            const now = Date.now();
            const lastRefreshAt = item.lastRefreshAt || 0;
            if (now - lastRefreshAt > 150) {
                item.lastRefreshAt = now;
                createTimeout(cache, item, normalizeMaxAge, onCacheChange);
                const itemValue = Object.assign(item.value, {status: PENDING, reason: null});
                itemValue.promise = fn
                    .apply(this, args)
                    .then(data => {
                        Object.assign(itemValue, {status: FULFILLED, data, reason: null});
                        onCacheChange(args);
                    })
                    .catch(error => {
                        Object.assign(itemValue, {status: REJECTED, data: null, reason: error});
                        onCacheChange(args);
                    });
            }
        }

        return item.value;
    }

    Object.defineProperty(memoized, 'cache', {
        value: cache,
    });

    return memoized;
}
