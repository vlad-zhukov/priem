export function type(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    const typeofValue = typeof value;
    if (typeofValue !== 'object') return typeofValue;
    if (Array.isArray(value) === true) return 'array';
    return 'object';
}

export const isBrowser = typeof window === 'object' && typeof document === 'object' && document.nodeType === 9;
