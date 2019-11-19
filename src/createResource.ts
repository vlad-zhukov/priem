import * as React from 'react';
import {TypeName} from '@sindresorhus/is';
import {Resource, ResourceOptions, Subscriber, Status, MemoizedKey} from './Resource';
import {assertType, isBrowser, shallowEqual, useForceUpdate, useLazyRef} from './utils';

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
    invalidate: () => void;
}

export type Result<DataType> = [DataType | undefined, ResultMeta];

interface Refs<Args, DataType> extends Subscriber<Args> {
    args?: Args;
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
                // A callback for Resource#onCacheChange
                return false;
            },
            lastTimeCalled: 0,
        });

        refs.args = args;
        refs.onChange = function onChange(prevArgs, shouldCommit) {
            if (refs.args && prevArgs && shallowEqual(refs.args, prevArgs)) {
                if (shouldCommit) {
                    forceUpdate();
                }
                return true;
            }
            return false;
        };

        useLazyRef(() => {
            if (!!options.refreshOnMount && refs.args) {
                resource.delete(refs.args);
            }
            resource.subscribe(refs);
        });

        React.useEffect(() => {
            return () => {
                resource.unsubscribe(refs);
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        const {lastTimeCalled, prevResult} = refs;
        const now = Date.now();
        refs.lastTimeCalled = now;

        /**
         * Should this call get debounced and rescheduled,
         * and return the previous value to reduce the amount of requests?
         *
         * We should debounce when all conditions are met:
         * 1. Arguments are provided.
         * 2. Previous result is valid.
         * 3. Less than 150ms lapsed since the last call.
         * 4. The item is not in the cache.
         */
        const shouldDebounce =
            isBrowser &&
            args !== undefined &&
            !!prevResult &&
            now - lastTimeCalled < DEFAULT_DEBOUNCE_MS &&
            !resource.has(args);

        // TODO: rework debounce
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

        const meta: ResultMeta = {
            pending: false,
            fulfilled: false,
            rejected: false,
            reason: undefined,
            invalidate() {
                if (refs.args) {
                    resource.invalidate(refs.args, false);
                    resource.read(refs.args, {maxAge: options.maxAge});
                }
            },
        };

        if (args === undefined) {
            return [undefined, meta];
        }

        const ret = resource.read(args, {maxAge: options.maxAge});

        if ((!ret || ret.status === Status.PENDING) && !!prevResult) {
            return prevResult;
        }

        let data = prevResult ? prevResult[0] : undefined;

        if (ret) {
            if (ret.data) {
                data = ret.data;
            }
            meta.pending = ret.status === Status.PENDING;
            meta.fulfilled = ret.status === Status.FULFILLED;
            meta.rejected = ret.status === Status.REJECTED;
            meta.reason = ret.reason;
        }

        const result: Result<DataType> = [data, meta];
        refs.prevResult = result;

        return result;
    };
}
