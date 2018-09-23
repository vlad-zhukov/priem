import {noop, createGetKeyIndex, isSameValueZero, orderByLru} from './utils';
import {getMaxAgeOptions} from './maxAge';

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
        ...extraOptions
    } = options;

    const getKeyIndex = createGetKeyIndex(isEqual);
    const expirations = [];
    const {onCacheAdd, onCacheHit} = getMaxAgeOptions(
        expirations,
        {onCacheChange, maxAge, onExpire, updateExpire},
        isEqual
    );

    const normalizedOptions = Object.assign({}, extraOptions, {
        isEqual,
        maxSize,
        maxAge,
        onCacheAdd,
        onCacheChange,
        onCacheHit,
        onExpire,
        updateExpire,
    });

    const keys = [];
    const values = [];
    const cache = {
        keys,
        values,
        get size() {
            return keys.length;
        },
    };

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
        const keyIndex = getKeyIndex(keys, args);

        if (~keyIndex) {
            onCacheHit(cache, normalizedOptions, memoized);

            if (keyIndex) {
                orderByLru(keys, keys[keyIndex], keyIndex);
                orderByLru(values, values[keyIndex], keyIndex);

                onCacheChange(cache, normalizedOptions, memoized);
            }
        } else {
            if (keys.length >= maxSize) {
                keys.pop();
                values.pop();
            }

            const item = {
                status: PENDING,
                value: null,
                reason: null,
            };

            orderByLru(keys, args, keys.length);
            orderByLru(values, item, values.length);

            item.promise = fn
                .apply(this, args)
                .then(result => {
                    item.status = FULFILLED;
                    item.value = result;
                    item.reason = null;

                    onCacheHit(cache, normalizedOptions, memoized);
                    onCacheChange(cache, normalizedOptions, memoized);

                    return result;
                })
                .catch(error => {
                    item.status = REJECTED;
                    item.value = null;
                    item.reason = error;

                    onCacheHit(cache, normalizedOptions, memoized);
                    onCacheChange(cache, normalizedOptions, memoized);
                });

            onCacheAdd(cache, normalizedOptions, memoized);
            onCacheChange(cache, normalizedOptions, memoized);
        }

        return values[0];
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
        options: {
            configurable: true,
            get() {
                return normalizedOptions;
            },
        },
    });

    return memoized;
}
