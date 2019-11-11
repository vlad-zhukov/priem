import * as React from 'react';
import {TypeName} from '@sindresorhus/is';
import {Resource, ResourceOptions, Subscriber, STATUS, MemoizedKey} from './Resource';
import {assertType, shallowEqual, useForceUpdate, useLazyRef} from './utils';

const DEFAULT_DEBOUNCE_MS = 150;

export interface Options {
    maxAge?: number;
    refreshOnMount?: boolean;
}

export interface ResultMeta {
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason: Error | undefined;
    refresh: () => void;
}

export type Result<DataType> = [DataType | undefined, ResultMeta];

interface Refs<Args, DataType> extends Subscriber<Args> {
    shouldForceUpdate: boolean;
    lastTimeCalled: number;
    prevResult?: Result<DataType>;
}

export function createResource<DataType, Args extends MemoizedKey>(
    fn: (args: Args) => Promise<DataType>,
    resourceOptions: ResourceOptions = {},
) {
    const resource = new Resource<DataType, Args>(fn, resourceOptions);

    return function useResource(args: Args | undefined, options: Options = {}): Result<DataType> {
        assertType(args, [TypeName.Object, TypeName.undefined], '`args`');

        const forceUpdate = useForceUpdate();

        const {current: refs} = React.useRef<Refs<Args, DataType>>({
            /* istanbul ignore next */
            onChange() {
                return;
            },
            shouldForceUpdate: !!options.refreshOnMount,
            lastTimeCalled: 0,
        });

        // A callback for Resource#onCacheChange
        refs.onChange = (prevArgs, shouldForceUpd) => {
            if (args && prevArgs && shallowEqual(args, prevArgs)) {
                refs.shouldForceUpdate = shouldForceUpd;
                forceUpdate();
            }
        };

        useLazyRef(() => {
            resource.subscribe(refs);
        });

        React.useEffect(() => {
            return () => {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                resource.unsubscribe(refs);
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        const {lastTimeCalled, prevResult, shouldForceUpdate} = refs;
        const now = Date.now();
        refs.lastTimeCalled = now;
        refs.shouldForceUpdate = false;

        /**
         * Should this call get debounced and rescheduled,
         * and return the previous value to reduce the amount of requests?
         *
         * We should debounce when all conditions are met:
         * 1. Argument are provided.
         * 2. This call is not forced.
         * 3. Previous result is valid.
         * 4. Less than 150ms lapsed since the last call.
         * 5. The item is not in the cache.
         */
        const shouldDebounce =
            args !== undefined &&
            !shouldForceUpdate &&
            !!prevResult &&
            now - lastTimeCalled < DEFAULT_DEBOUNCE_MS &&
            !resource.has(args);

        React.useEffect(() => {
            let handler: number | undefined;
            if (shouldDebounce) {
                handler = window.setTimeout(forceUpdate, DEFAULT_DEBOUNCE_MS);
            }
            return () => window.clearTimeout(handler);
        });

        if (shouldDebounce) {
            return prevResult as Result<DataType>;
        }

        const ret = resource.read(args, {forceRefresh: shouldForceUpdate, maxAge: options.maxAge});

        if ((!ret || ret.status === STATUS.PENDING) && !!prevResult) {
            return prevResult;
        }

        let data = prevResult ? prevResult[0] : undefined;
        const meta: ResultMeta = {
            pending: false,
            fulfilled: false,
            rejected: false,
            reason: undefined,
            refresh() {
                refs.shouldForceUpdate = true;
                forceUpdate();
            },
        };

        if (ret) {
            if (ret.data) {
                data = ret.data;
            }
            meta.pending = ret.status === STATUS.PENDING;
            meta.fulfilled = ret.status === STATUS.FULFILLED;
            meta.rejected = ret.status === STATUS.REJECTED;
            meta.reason = ret.reason;
        }

        const result: Result<DataType> = [data, meta];
        refs.prevResult = result;

        return result;
    };
}
