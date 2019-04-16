import is, {TypeName} from '@sindresorhus/is';

export const noop = (): void => {};

export const isBrowser: boolean = typeof window === 'object' && typeof document === 'object' && document.nodeType === 9;

export function assertType(
    variable: unknown,
    types: readonly TypeName[],
    variableName: string = 'The value'
): void | never {
    const typeOfVariable = is(variable);

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

    if (!isValid) {
        throw new TypeError(
            `Priem: ${variableName} must be one of the following: '${typesAsString}', but got: '${typeOfVariable}'.`
        );
    }
}

function isSameValueZero(object1: unknown, object2: unknown): object1 is typeof object2 {
    return object1 === object2 || (object1 !== object1 && object2 !== object2);
}

export function areKeysEqual(keys1: readonly any[], keys2: readonly any[]): boolean {
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (let i = 0; i < keys1.length; i++) {
        if (!isSameValueZero(keys1[i], keys2[i])) {
            return false;
        }
    }
    return true;
}
