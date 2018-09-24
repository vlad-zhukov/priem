export const noop = () => {};

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
