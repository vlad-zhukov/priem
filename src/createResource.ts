import * as React from 'react';
import {TypeName} from '@sindresorhus/is';
import {Resource, ResourceOptions, Subscriber, MemoizedKey, STATUS} from './Resource';
import {areKeysEqual, assertType} from './utils';

function useForceUpdate(): () => void {
    const [, setTick] = React.useState(0);
    return React.useCallback(() => {
        setTick(tick => tick + 1);
    }, []);
}

const DEFAULT_DEBOUNCE_MS = 150;

export interface CreateResourceOptions extends ResourceOptions {
    refreshOnMount?: boolean;
}

export interface ResultMeta {
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason?: Error;
    refresh: () => void;
}

export type Result<DataType> = [DataType | undefined, ResultMeta];

interface Refs<Args, DataType> extends Subscriber<Args> {
    shouldForceUpdate: boolean;
    lastTimeCalled: number;
    prevResult?: Result<DataType>;
}

export function createResource<DataType, Args extends MemoizedKey = []>(
    fn: (...args: Args) => Promise<DataType>,
    options: CreateResourceOptions = {}
) {
    const resource = new Resource<Args, DataType>(fn, options);

    return function useResource(args: Args | null): Result<DataType> {
        assertType(args, [TypeName.Array, TypeName.null], '`args`');

        const rerender = useForceUpdate();
        const refs = React.useRef<Refs<Args, DataType>>({
            /* istanbul ignore next */
            onChange() {},
            shouldForceUpdate: !!options.refreshOnMount,
            lastTimeCalled: 0,
        });

        // A callback for Resource#onCacheChange
        refs.current.onChange = (prevArgs, forceUpdate) => {
            if (prevArgs && args && areKeysEqual(args, prevArgs)) {
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
            !shouldForceUpdate && prevResult && now - lastTimeCalled < DEFAULT_DEBOUNCE_MS && !resource.has(args);

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

        if ((!ret || ret.status === STATUS.PENDING) && prevResult) {
            return prevResult;
        }

        let data = prevResult ? prevResult[0] : undefined;
        const meta: ResultMeta = {
            pending: false,
            fulfilled: false,
            rejected: false,
            refresh() {
                refs.current.shouldForceUpdate = true;
                rerender();
            },
        };

        if (ret) {
            if (ret.data) {
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
