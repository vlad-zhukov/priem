export function type(value) {
    if (value !== value) return 'NaN'; // eslint-disable-line no-self-compare
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    const typeofValue = typeof value;
    if (typeofValue !== 'object') return typeofValue;
    if (Array.isArray(value) === true) return 'array';
    return 'object';
}

export function assertType(variable, types, variableName = 'The value') {
    const typeOfVariable = type(variable);

    let typesAsString = '';
    let isValid = false;
    for (let i = 0, l = types.length; i < l; i++) {
        if (typesAsString.length > 0) {
            typesAsString += ', ';
        }
        typesAsString += types[i];

        if (typeOfVariable === types[i]) {
            isValid = true;
        }
    }

    if (isValid === false) {
        const error = new TypeError(
            `Priem: ${variableName} must be one of the following: '${typesAsString}', but got: '${typeOfVariable}'.`
        );
        error.framesToPop = 1;
        throw error;
    }
}

export const isBrowser = typeof window === 'object' && typeof document === 'object' && document.nodeType === 9;
