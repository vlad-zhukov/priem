import {Cache, CacheItem} from './Cache';
import {noop, isSameValueZero, createAreKeysEqual} from './utils';

export const PENDING = 0;
export const FULFILLED = 1;
export const REJECTED = 2;

/**
 * @function memoize
 *
 * @description
 * get the memoized version of the method passed
 *
 * @param {function} fn the method to memoize
 * @param {Object} [options={}] the options to build the memoizer with
 * @param {boolean} [options.isEqual=isSameValueZero] the method to compare equality of keys with
 * @param {number} [options.maxSize=1] the number of items to store in cache
 * @returns {function} the memoized method
 */
export default function memoize(fn, options = {}) {
    const {
        isEqual = isSameValueZero,
        maxSize = 1,
        maxAge = Infinity,
        onCacheChange = noop,
        onExpire = noop,
        updateExpire = false,
    } = options;

    const areKeysEqual = createAreKeysEqual(isEqual);

    const cache = new Cache(null, {
        maxAge,
        onExpire,
        onDelete() {
            onCacheChange();
        },
    });

    /**
     * @function memoized
     *
     * @description
     * the memoized version of the method passed
     *
     * @param {...Array<any>} args the arguments passed, which create a unique cache key
     * @returns {any} the value of the method called with the arguments
     */
    function memoized(...args) {
        const isForced = (this && this.isForced) || false;

        let result = cache.findBy(item => areKeysEqual(item.key, args));

        if (result) {
            if (isForced) {
                cache.delete(result);
                result = null;
            } else if (result === cache.head) {
                if (updateExpire) {
                    cache.hit(result);
                }
            } else {
                cache.delete(result);
                cache.prepend(result);
                onCacheChange();
            }
        }

        if (!result) {
            if (cache.size >= maxSize) {
                cache.delete(cache.tail);
            }

            const itemValue = {status: PENDING, value: null, reason: null};
            const item = new CacheItem(args, itemValue);

            cache.prepend(item);
            onCacheChange();

            itemValue.promise = fn
                .apply(this, args)
                .then(value => {
                    Object.assign(itemValue, {status: FULFILLED, value, reason: null});

                    if (updateExpire) {
                        cache.hit(item);
                    }

                    onCacheChange();

                    return value;
                })
                .catch(error => {
                    Object.assign(itemValue, {status: REJECTED, value: null, reason: error});

                    if (updateExpire) {
                        cache.hit(item);
                    }

                    onCacheChange();
                });
        }

        return cache.head.value;
    }

    Object.defineProperties(memoized, {
        cache: {
            configurable: true,
            get() {
                return cache;
            },
        },
        isMemoized: {
            configurable: true,
            get() {
                return true;
            },
        },
    });

    return memoized;
}
