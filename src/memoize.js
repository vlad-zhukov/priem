import {Cache, CacheItem} from './Cache';
import {noop, type} from './helpers';

/**
 * @function isSameValueZero
 *
 * @description
 * are the objects equal based on SameValueZero
 *
 * @param {any} object1 the first object to compare
 * @param {any} object2 the second object to compare
 * @returns {boolean} are the two objects equal
 */
function isSameValueZero(object1, object2) {
    // eslint-disable-next-line no-self-compare
    return object1 === object2 || (object1 !== object1 && object2 !== object2);
}

/**
 * @function areKeysEqual
 *
 * @description
 * are the keys shallowly equal to one another
 *
 * @param {Array<any>} keys1 the keys array to test against
 * @param {Array<any>} keys2 the keys array to test
 * @returns {boolean} are the keys shallowly equal
 */
export function areKeysEqual(keys1, keys2) {
    if (keys1.length !== keys2.length) {
        return false;
    }

    for (let index = 0; index < keys1.length; index++) {
        if (!isSameValueZero(keys1[index], keys2[index])) {
            return false;
        }
    }

    return true;
}

export const PENDING = 0;
export const FULFILLED = 1;
export const REJECTED = 2;

function createTimeout(cache, item, maxAge, onCacheChange) {
    if (maxAge !== null) {
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

    function memoized(args, options) {
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

            const forceRefresh = (options && options.forceRefresh) || false;
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

    Object.defineProperties(memoized, {
        cache: {
            value: cache,
        },
        isMemoized: {
            value: true,
        },
    });

    return memoized;
}
