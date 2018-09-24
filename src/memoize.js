import {LinkedList, LinkedListNode} from './LinkedList';
import {noop, isSameValueZero, createAreKeysEqual} from './utils';
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

    const areKeysEqual = createAreKeysEqual(isEqual);
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

    const cache = new LinkedList();

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

        let result = cache.findBy(node => areKeysEqual(node.key, args));

        if (result) {
            if (isForced) {
                cache.deleteBy(node => node === result);
                result = null;
            } else if (result !== cache.head) {
                cache.deleteBy(node => node === result);
                cache.prepend(result);
                onCacheHit(cache, normalizedOptions, memoized);
                onCacheChange(cache, normalizedOptions, memoized);
            }
        }

        if (!result) {
            if (cache.size >= maxSize) {
                cache.deleteBy(node => node['@next'] === null);
            }

            const nodeValue = {status: PENDING, value: null, reason: null};
            const node = new LinkedListNode(args, nodeValue);
            cache.prepend(node);

            nodeValue.promise = fn
                .apply(this, args)
                .then(result => {
                    Object.assign(nodeValue, {status: FULFILLED, value: result, reason: null});

                    onCacheHit(cache, normalizedOptions, memoized);
                    onCacheChange(cache, normalizedOptions, memoized);

                    return result;
                })
                .catch(error => {
                    Object.assign(nodeValue, {status: REJECTED, value: null, reason: error});

                    onCacheHit(cache, normalizedOptions, memoized);
                    onCacheChange(cache, normalizedOptions, memoized);
                });

            onCacheAdd(cache, normalizedOptions, memoized);
            onCacheChange(cache, normalizedOptions, memoized);
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
        options: {
            configurable: true,
            get() {
                return normalizedOptions;
            },
        },
    });

    return memoized;
}
