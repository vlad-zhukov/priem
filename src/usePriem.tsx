import * as React from 'react';
import {Resource, Subscriber} from './Resource';
import {MemoizedKey, areKeysEqual, STATUS} from './memoize';
import {assertType, noop} from './helpers';

function useForceUpdate(): () => void {
    const [, setTick] = React.useState(0);

    return React.useCallback(() => {
        setTick(tick => tick + 1);
    }, []);
}

const DEFAULT_DEBOUNCE_MS = 150;

type ResultMeta = {
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason: Error | null;
    refresh: () => void;
};

type Result<DataType> = [DataType | null, ResultMeta];

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

    const rerender = useForceUpdate();
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
            rerender();
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
            handler = window.setTimeout(rerender, DEFAULT_DEBOUNCE_MS);
        }
        return () => window.clearTimeout(handler);
    });

    if (shouldDebounce) {
        return prevResult as Result<DataType>;
    }

    const ret = source.current.get(args, shouldForceUpdate);

    if ((ret === null || ret.status === STATUS.PENDING) && prevResult !== null) {
        return prevResult;
    }

    let data = prevResult ? prevResult[0] : null;
    const meta: ResultMeta = {
        pending: false,
        fulfilled: false,
        rejected: false,
        reason: null,
        refresh() {
            refs.current.shouldForceUpdate = true;
            rerender();
        },
    };

    if (ret !== null) {
        if (ret.data !== null) {
            data = ret.data as DataType;
        }
        meta.pending = ret.status === STATUS.PENDING;
        meta.fulfilled = ret.status === STATUS.FULFILLED;
        meta.rejected = ret.status === STATUS.REJECTED;
        meta.reason = ret.reason;
    }

    const result: Result<DataType> = [data, meta];
    refs.current.prevResult = result;

    return result;
}
