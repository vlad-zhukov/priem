import {LinkedList, LinkedListNode} from './LinkedList';
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

    const cache = new LinkedList(null, {});

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
                cache.delete(result);
                result = null;
            } else if (result === cache.head) {
                if (updateExpire) {
                    result.hit();
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

            const nodeValue = {status: PENDING, value: null, reason: null};
            const node = new LinkedListNode({
                key: args,
                value: nodeValue,
                maxAge,
                onExpire,
                deleteNode(n) {
                    cache.delete(n);
                    onCacheChange();
                },
            });
            cache.prepend(node);
            onCacheChange();

            nodeValue.promise = fn
                .apply(this, args)
                .then(value => {
                    Object.assign(nodeValue, {status: FULFILLED, value, reason: null});

                    if (updateExpire) {
                        node.hit();
                    }

                    onCacheChange();

                    return value;
                })
                .catch(error => {
                    Object.assign(nodeValue, {status: REJECTED, value: null, reason: error});

                    if (updateExpire) {
                        node.hit();
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
