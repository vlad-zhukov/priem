import {Cache, CacheItem} from './Cache';
import {noop} from './helpers';

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
export const isSameValueZero = (object1, object2) =>
    // eslint-disable-next-line no-self-compare
    object1 === object2 || (object1 !== object1 && object2 !== object2);

export const createAreKeysEqual = isEqual =>
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
        (keys1, keys2) => {
        if (keys1.length !== keys2.length) {
            return false;
        }

        for (let index = 0; index < keys1.length; index++) {
            if (!isEqual(keys1[index], keys2[index])) {
                return false;
            }
        }

        return true;
    };

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
    } = options;

    const areKeysEqual = createAreKeysEqual(isEqual);

    const cache = new Cache(undefined, {
        maxAge,
        onCacheChange,
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
                // TODO: force updating should not remove previous data
                cache.remove(result);
                result = null;
            } else if (result !== cache.head) {
                cache.moveToHead(result);
            }
        }

        if (!result) {
            if (cache.size >= maxSize) {
                cache.remove(cache.tail);
            }

            const itemValue = {status: PENDING, value: null, reason: null};
            const item = new CacheItem(args, itemValue);

            cache.prepend(item);

            itemValue.promise = fn
                .apply(this, args)
                .then(value => {
                    Object.assign(itemValue, {status: FULFILLED, value, reason: null});
                    onCacheChange();
                    return value;
                })
                .catch(error => {
                    Object.assign(itemValue, {status: REJECTED, value: null, reason: error});
                    onCacheChange();
                });
        }

        return cache.head.value;
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
