import {createGetKeyIndex, noop} from './utils';

/**
 * @private
 *
 * @function findExpirationIndex
 *
 * @description
 * find the index of the expiration based on the key
 *
 * @param {Array<Expiration>} expirations the list of expirations
 * @param {Array<any>} key the key to match
 * @returns {number} the index of the expiration
 */
export const findExpirationIndex = (expirations, key) => {
    for (let index = 0; index < expirations.length; index++) {
        if (expirations[index].key === key) {
            return index;
        }
    }
    return -1;
};

/**
 * @private
 *
 * @function clearExpiration
 *
 * @description
 * clear an active expiration and remove it from the list if applicable
 *
 * @param {Array<Expiration>} expirations the list of expirations
 * @param {any} expirationIndex the key to clear
 * @param {boolean} [shouldRemove] should the expiration be removed from the list
 */
export const clearExpiration = (expirations, expirationIndex, shouldRemove) => {
    if (~expirationIndex) {
        clearTimeout(expirations[expirationIndex].timeoutId);

        if (shouldRemove) {
            expirations.splice(expirationIndex, 1);
        }
    }
};

export const createOnCacheAddSetExpiration = (expirations, options, isEqual) => {
    const {maxAge, onCacheChange, onExpire} = options;

    const findKeyIndex = createGetKeyIndex(isEqual);

    /**
     * @private
     *
     * @function onCacheAdd
     *
     * @description
     * when an item is added to the cache, add an expiration for it
     *
     * @modifies {expirations}
     *
     * @param {Cache} cache the cache of the memoized function
     * @param {Options} moizedOptions the options passed to the memoized function
     * @param {function} moized the memoized function
     * @returns {void}
     */
    return function onCacheAdd(cache, moizedOptions, moized) {
        const key = cache.keys[0];

        if (!~findExpirationIndex(expirations, key)) {
            const expirationMethod = () => {
                const keyIndex = findKeyIndex(cache.keys, key);
                const value = cache.values[keyIndex];

                if (~keyIndex) {
                    cache.keys.splice(keyIndex, 1);
                    cache.values.splice(keyIndex, 1);

                    onCacheChange(cache, moizedOptions, moized);
                }

                const expirationIndex = findExpirationIndex(expirations, key);
                clearExpiration(expirations, expirationIndex, true);

                if (onExpire(key) === false) {
                    cache.keys.unshift(key);
                    cache.values.unshift(value);

                    createOnCacheAddSetExpiration(expirations, options, isEqual)(cache, moizedOptions, moized);
                    onCacheChange(cache, moizedOptions, moized);
                }
            };

            expirations.push({
                expirationMethod,
                key,
                timeoutId: setTimeout(expirationMethod, maxAge),
            });
        }
    };
};

export const createOnCacheHitResetExpiration = (expirations, options) => {
    const {maxAge} = options;

    /**
     * @private
     *
     * @function onCacheHit
     *
     * @description
     * when a cache item is hit, reset the expiration
     *
     * @modifies {expirations}
     *
     * @param {Cache} cache the cache of the memoized function
     * @returns {void}
     */
    return function onCacheHit(cache) {
        const key = cache.keys[0];
        const expirationIndex = findExpirationIndex(expirations, key);

        if (~expirationIndex) {
            clearExpiration(expirations, expirationIndex, false);
            // eslint-disable-next-line no-param-reassign
            expirations[expirationIndex].timeoutId = setTimeout(expirations[expirationIndex].expirationMethod, maxAge);
        }
    };
};

/**
 * @private
 *
 * @function getMaxAgeOptions
 *
 * @description
 * get the micro-memoize options specific to the maxAge option
 *
 * @param {Array<Expiration>} expirations the expirations for the memoized function
 * @param {Options} options the options passed to the moizer
 * @param {function} isEqual the function to test equality of the key on a per-argument basis
 * @returns {Object} the object of options based on the entries passed
 */
export const getMaxAgeOptions = (expirations, options, isEqual) => {
    const {maxAge, updateExpire} = options;

    let onCacheAdd = noop;
    // eslint-disable-next-line no-restricted-globals
    if (typeof maxAge === 'number' && isFinite(maxAge)) {
        onCacheAdd = createOnCacheAddSetExpiration(expirations, options, isEqual);
    }

    let onCacheHit = noop;
    if (onCacheAdd && updateExpire) {
        onCacheHit = createOnCacheHitResetExpiration(expirations, options);
    }

    return {onCacheAdd, onCacheHit};
};
