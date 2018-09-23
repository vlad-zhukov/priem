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

export const createGetKeyIndex = isEqual => {
    const areKeysEqual = createAreKeysEqual(isEqual);

    /**
     * @function getKeyIndex
     *
     * @description
     * get the index of the matching key
     *
     * @param {Array<Array<any>>} allKeys the list of all available keys
     * @param {Array<any>} keysToMatch the key to try to match
     *
     * @returns {number} the index of the matching key value, or -1
     */
    return (allKeys, keysToMatch) => {
        for (let index = 0; index < allKeys.length; index++) {
            if (areKeysEqual(allKeys[index], keysToMatch)) {
                return index;
            }
        }
        return -1;
    };
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

/**
 * @function orderByLru
 *
 * @description
 * order the array based on a Least-Recently-Used basis
 *
 * @param {Array<any>} array the array to order
 * @param {any} value the value to assign at the beginning of the array
 * @param {number} startingIndex the index of the item to move to the front
 */
export const orderByLru = (array, value, startingIndex) => {
    let index = startingIndex;
    while (index--) { // eslint-disable-line no-plusplus
        array[index + 1] = array[index]; // eslint-disable-line no-param-reassign
    }
    array[0] = value;  // eslint-disable-line no-param-reassign
};
