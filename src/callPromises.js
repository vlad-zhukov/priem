import moize from 'moize';
import {elementsEqual} from 'react-shallow-equal';
import * as promiseState from './promiseState';
import {type} from './helpers';

const memoized = {};

function memoizeAsyncValue(key, value, onExpire) {
    const typeOfValue = type(value);
    if (typeOfValue !== 'object') {
        throw new TypeError(`Priem: argument 'values' must return an object of objects, but got: '${typeOfValue}'.`);
    }

    const typeOfValuePromise = type(value.promise);
    if (typeOfValuePromise !== 'function') {
        throw new TypeError(
            "Priem: argument 'values' must return an object of objects with a property 'promise' " +
                `each, but got: '${typeOfValuePromise}'.`
        );
    }

    memoized[key] = moize(value.promise, {
        isPromise: true,
        maxAge: value.maxAge,
        maxArgs: value.maxArgs,
        maxSize: value.maxSize,
        onExpire,
    });
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

function callPromise({props, key, asyncValue, prevArgs, onExpire, isMounting, isForced}) {
    // Do not recall rejected (uncached) promises unless forced
    if (
        isForced === false &&
        props.priem !== undefined &&
        props.priem[key] !== undefined &&
        props.priem[key].rejected === true
    ) {
        return;
    }

    const args = type(asyncValue.args) === 'array' ? asyncValue.args : [];

    if (memoized[key] !== undefined) {
        if (memoized[key].has(args) === true) {
            if (isMounting === false && elementsEqual(args, prevArgs)) {
                return;
            }
        }
        else {
            // Only set to refreshing when the result is not cached
            props.setPriem(s => ({
                [key]: promiseState.refreshing(s[key]),
            }));
        }
    }
    else {
        memoizeAsyncValue(key, asyncValue, onExpire);

        if (isMounting === false) {
            props.setPriem({
                [key]: promiseState.pending(),
            });
        }
    }

    memoized[key](...args)
        .then((result) => {
            props.setPriem({
                [key]: promiseState.fulfilled(result),
            });
        })
        .catch((e) => {
            props.setPriem({
                [key]: promiseState.rejected(e.message),
            });
        });
}

export function callPromises({props, prevProps, onExpire, isMounting = false, isForced = false}) {
    // Stop auto-refreshing
    if (props.autoRefresh === false && isForced === false) {
        return;
    }

    const asyncValues = extractAsyncValues(props);
    const prevAsyncValues = prevProps && prevProps.priem ? extractAsyncValues(prevProps) : null;
    const asyncKeys = Object.keys(asyncValues);
    for (let i = 0, l = asyncKeys.length; i < l; i++) {
        const key = asyncKeys[i];
        const asyncValue = asyncValues[key];

        const prevArgs =
            prevAsyncValues && type(prevAsyncValues[key].args) === 'array' ? prevAsyncValues[key].args : [];

        callPromise({props, key, asyncValue, prevArgs, onExpire, isMounting, isForced});
    }
}
