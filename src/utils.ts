// tslint:disable-next-line no-empty
export const noop = () => {};

export const isBrowser: boolean = typeof window === 'object' && typeof document === 'object' && document.nodeType === 9;

export function type(value: unknown): string {
    if (value !== value) return 'NaN';
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    const typeofValue = typeof value;
    if (typeofValue !== 'object') return typeofValue;
    if (Array.isArray(value) === true) return 'array';
    return 'object';
}

export function assertType(variable: unknown, types: string[], variableName: string = 'The value'): void | never {
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
        throw new TypeError(
            `Priem: ${variableName} must be one of the following: '${typesAsString}', but got: '${typeOfVariable}'.`
        );
    }
}

function isSameValueZero(object1: unknown, object2: unknown): boolean {
    return object1 === object2 || (object1 !== object1 && object2 !== object2);
}

export function areKeysEqual(keys1: unknown[], keys2: unknown[]): boolean {
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (let i = 0; i < keys1.length; i++) {
        if (isSameValueZero(keys1[i], keys2[i]) === false) {
            return false;
        }
    }
    return true;
}
