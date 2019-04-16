import * as React from 'react';
import {Resource, ResourceOptions, Subscriber} from './Resource';
import {MemoizedKey, STATUS} from './memoize';
import {assertType, noop, areKeysEqual} from './utils';

function useForceUpdate(): () => void {
    const [, setTick] = React.useState(0);
    return React.useCallback(() => {
        setTick(tick => tick + 1);
    }, []);
}

const DEFAULT_DEBOUNCE_MS = 150;

interface ResultMeta {
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason: Error | null;
    refresh: () => void;
}

type Result<DataType> = [DataType | null, ResultMeta];

interface Refs<DataType> extends Subscriber {
    shouldForceUpdate: boolean;
    lastTimeCalled: number;
    prevResult: Result<DataType> | null;
}

export default function createResource<DataType, Args extends MemoizedKey = []>(
    fn: (...args: Args) => Promise<unknown>,
    options: ResourceOptions = {}
) {
    const resource = new Resource<Args>(fn, options);

    return function useResource(args: Args | null): Result<DataType> {
        assertType(args, ['array', 'null'], '`args`');

        const rerender = useForceUpdate();
        const refs = React.useRef<Refs<DataType>>({
            onChange: noop,
            shouldForceUpdate: false,
            lastTimeCalled: 0,
            prevResult: null,
        });

        // A callback for Resource#onCacheChange
        refs.current.onChange = (prevArgs, forceUpdate) => {
            if (prevArgs !== null && args !== null && areKeysEqual(args, prevArgs)) {
                refs.current.shouldForceUpdate = forceUpdate;
                rerender();
            }
        };

        // Because subscribing happens after component was mount and cache was hit, cache can resolve before component
        // subscribe, and an update will be missed. Rerendering after subscribing ensures the component is up-to-date
        // and at the same time fetching is not blocked.
        React.useEffect(() => {
            resource.subscribe(refs.current);
            rerender();
            return () => {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                resource.unsubscribe(refs.current);
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        const {lastTimeCalled, prevResult, shouldForceUpdate} = refs.current;
        const now = Date.now();
        refs.current.lastTimeCalled = now;
        refs.current.shouldForceUpdate = false;

        /**
         * Should this call get debounced and rescheduled,
         * and return the previous value to reduce the amount of requests?
         *
         * We should debounce when all conditions are met:
         * 1. This call is not forced.
         * 2. Previous result is valid.
         * 3. Less than 150ms lapsed since the last call.
         * 4. The item is not in the cache.
         */
        const shouldDebounce =
            !shouldForceUpdate &&
            prevResult !== null &&
            now - lastTimeCalled < DEFAULT_DEBOUNCE_MS &&
            !resource.has(args);

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

        const ret = resource.get(args, shouldForceUpdate);

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
    };
}
