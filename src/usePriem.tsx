import * as React from 'react';
import {Resource, Subscriber} from './Resource';
import {MemoizedKey, areKeysEqual, STATUS} from './memoize';
import {assertType, noop} from './helpers';

const DEFAULT_DEBOUNCE_MS = 150;

type Result<DataType> = {
    data: DataType | null;
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason: Error | null;
    refresh: () => void;
};

type Refs<DataType> = Subscriber & {
    shouldForceUpdate: boolean;
    lastTimeCalled: number;
    prevResult: Result<DataType> | null;
};

export default function usePriem<DataType>(resource: Resource, args: MemoizedKey | null = []): Result<DataType> {
    if (!(resource instanceof Resource)) {
        throw new TypeError("usePriem: 'resource' must be an instance of 'Resource'.");
    }
    assertType(args, ['array', 'null'], '`args`');

    const [, rerender] = React.useState(null);
    const source = React.useRef(resource);
    const refs = React.useRef<Refs<DataType>>({
        // tslint:disable-next-line no-empty
        onChange: noop,
        shouldForceUpdate: false,
        lastTimeCalled: 0,
        prevResult: null,
    });

    if (source.current !== resource) {
        throw new TypeError("usePriem: it looks like you've passed a different 'resource' value after initializing.");
    }

    // A callback for onCacheChange
    refs.current.onChange = (prevArgs, forceUpdate) => {
        if (prevArgs !== null && args !== null && areKeysEqual(args, prevArgs)) {
            refs.current.shouldForceUpdate = forceUpdate;
            rerender(null);
        }
    };

    React.useEffect(() => {
        source.current.subscribe(refs.current);
        return () => source.current.unsubscribe(refs.current);
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
     * 3. Less than 150ms lapsed since the last call.
     * 4. The item is not in the cache.
     */
    const shouldDebounce =
        shouldForceUpdate !== true &&
        prevResult !== null &&
        now - lastTimeCalled < DEFAULT_DEBOUNCE_MS &&
        source.current.has(args) === false;

    React.useEffect(() => {
        let handler: number | undefined;
        if (shouldDebounce) {
            handler = setTimeout(rerender, DEFAULT_DEBOUNCE_MS);
        }
        return () => clearTimeout(handler);
    });

    if (shouldDebounce) {
        return prevResult as Result<DataType>;
    }

    const ret = source.current.get(args, shouldForceUpdate);

    if ((ret === null || ret.status === STATUS.PENDING) && prevResult !== null) {
        return prevResult;
    }

    const result: Result<DataType> = {
        data: null,
        pending: false,
        fulfilled: false,
        rejected: false,
        reason: null,
        refresh() {
            refs.current.shouldForceUpdate = true;
            rerender(null);
        },
    };

    if (ret !== null) {
        result.data = ret.data as DataType;
        result.pending = ret.status === STATUS.PENDING;
        result.fulfilled = ret.status === STATUS.FULFILLED;
        result.rejected = ret.status === STATUS.REJECTED;
        result.reason = ret.reason;
    }

    refs.current.prevResult = result;

    return result;
}
