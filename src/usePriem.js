import React from 'react';
import {Resource} from './Resource';
import {areKeysEqual, PENDING, FULFILLED, REJECTED} from './memoize';
import {assertType} from './helpers';

const DEFAULT_DEBOUNCE_MS = 150;

export default function usePriem(resource, args = []) {
    if (!(resource instanceof Resource)) {
        throw new TypeError("usePriem: 'resource' must be an instance of 'Resource'.");
    }
    assertType(args, ['array', 'null'], '`args`');

    const [, rerender] = React.useState();
    const refs = React.useRef({component: null, shouldForceUpdate: false, lastTimeCalled: 0, prevResult: null});
    const source = React.useRef(resource);

    if (source.current !== resource) {
        throw new TypeError("usePriem: it looks like you've passed a different 'resource' value after initializing.");
    }

    refs.current.component = (prevArgs, forceUpdate) => {
        if (prevArgs !== null && args !== null && areKeysEqual(args, prevArgs)) {
            refs.current.shouldForceUpdate = forceUpdate;
            rerender();
        }
    };

    React.useEffect(() => {
        source.current._subscribe(refs.current);
        return () => source.current._unsubscribe(refs.current);
    }, []);

    const {lastTimeCalled, prevResult, shouldForceUpdate} = refs.current;
    const now = Date.now();
    refs.current.lastTimeCalled = now;
    refs.current.shouldForceUpdate = false;

    /**
     * Should this call be rescheduled for later and return the previous value?
     * The reasoning behind it is to reduce the amount of requests.
     *
     * When we should debounce:
     * 1. This call is not forced.
     * 2. Previous result is valid.
     * 3. More than 150ms lapsed since the last call.
     * 4. The cache has no item.
     */
    const shouldDebounce =
        shouldForceUpdate !== true &&
        prevResult !== null &&
        prevResult.pending === false &&
        prevResult.rejected === false &&
        now - lastTimeCalled < DEFAULT_DEBOUNCE_MS &&
        source.current._has(args) === false;

    React.useEffect(() => {
        let handler;
        if (shouldDebounce) {
            handler = setTimeout(rerender, DEFAULT_DEBOUNCE_MS);
        }
        return () => clearTimeout(handler);
    });

    if (shouldDebounce) {
        return prevResult;
    }

    const ret = source.current._get(args, shouldForceUpdate);

    if ((ret === null || ret.status === PENDING) && prevResult !== null) {
        return prevResult;
    }

    const result = {
        data: null,
        pending: true,
        fulfilled: false,
        rejected: false,
        reason: null,
        refresh() {
            refs.current.shouldForceUpdate = true;
            rerender();
        },
    };

    if (ret !== null) {
        result.data = ret.data;
        result.pending = ret.status === PENDING;
        result.fulfilled = ret.status === FULFILLED;
        result.rejected = ret.status === REJECTED;
        result.reason = ret.reason;
    }

    refs.current.prevResult = result;

    return result;
}
