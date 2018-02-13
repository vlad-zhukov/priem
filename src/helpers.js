export function type(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    const typeofValue = typeof value;
    if (typeofValue !== 'object') return typeofValue;
    if (Array.isArray(value) === true) return 'array';
    return 'object';
}

export function extractAsyncValues(props) {
    if (type(props.asyncValues) !== 'function') {
        return {};
    }

    const values = props.asyncValues(props);

    const typeOfValues = type(values);
    if (typeOfValues !== 'object') {
        throw new TypeError(
            `Priem: property 'asyncValues' must be a function that returns an object, but got: '${typeOfValues}'.`
        );
    }

    return values;
}
