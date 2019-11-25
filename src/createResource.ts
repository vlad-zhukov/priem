import * as React from 'react';
import {TypeName} from '@sindresorhus/is';
import {Resource, ResourceOptions, Subscriber, Status, MemoizedKey} from './Resource';
import {assertType, isBrowser, shallowEqual, useForceUpdate, useLazyRef} from './utils';

const DEFAULT_DEBOUNCE_MS = 150;

export interface Options {
    refreshInterval?: number;
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

export interface ResultPagesMeta extends ResultMeta {
    loadMore: () => void;
}

export type ResultPages<DataType> = [DataType[] | undefined, ResultPagesMeta];

type GetArgsFn<Args> = (prevArgs?: Args) => Args;

function getAllArgs<Args>(getArgs: GetArgsFn<Args> | undefined, count: number): Args[] {
    if (!getArgs) {
        return [];
    }

    const result: Args[] = [];
    let prevArgs: Args | undefined;

    for (let i = 0; i < count; i++) {
        prevArgs = getArgs(prevArgs);
        result.push(prevArgs);
    }

    return result;
}

interface Refs<Args, DataType> extends Subscriber<Args> {
    args?: Args;
    prevResult?: Result<DataType>;
    lastTimeCalled: number;
    debounceTimerId?: number;
}

interface RefsPages<Args, DataType> extends Subscriber<Args> {
    args: Args[];
    pageCount: number;
    prevResult?: ResultPages<DataType>;
    lastTimeCalled: number;
    debounceTimerId?: number;
}

export function createResource<DataType, Args extends MemoizedKey>(
    fn: (args: Args) => Promise<DataType>,
    resourceOptions: ResourceOptions = {},
) {
    const resource = new Resource<DataType, Args>(fn, resourceOptions);

    function useResource(args: Args | undefined, options: Options = {}): Result<DataType> {
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

        const meta: ResultMeta = {
            pending: false,
            fulfilled: false,
            rejected: false,
            reason: undefined,
            invalidate() {
                if (refs.args) {
                    resource.invalidate(refs.args, false);
                    resource.read(refs.args, {maxAge: options.refreshInterval});
                }
            },
        };

        if (args === undefined) {
            return [undefined, meta];
        }

        const {lastTimeCalled, prevResult} = refs;
        const now = Date.now();
        refs.lastTimeCalled = now;

        /**
         * Should this call get debounced and rescheduled,
         * and return the previous value to reduce the amount of requests?
         *
         * We should debounce when all conditions are met:
         * 1. We are running in browser.
         * 2. Previous result is valid.
         * 3. Less than 150ms lapsed since the last call.
         * 4. The item is not in the cache.
         */
        const shouldDebounce =
            isBrowser && !!prevResult && now - lastTimeCalled < DEFAULT_DEBOUNCE_MS && !resource.has(args);

        clearTimeout(refs.debounceTimerId);

        if (shouldDebounce) {
            refs.debounceTimerId = window.setTimeout(forceUpdate, DEFAULT_DEBOUNCE_MS);
            return prevResult as Result<DataType>;
        }

        const ret = resource.read(args, {maxAge: options.refreshInterval});

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
    }

    useResource.pages = function useResourcePages(
        getArgs: GetArgsFn<Args> | undefined,
        options: Options = {},
    ): ResultPages<DataType> {
        assertType(getArgs, [TypeName.Function, TypeName.undefined], '`getArgs`');

        const forceUpdate = useForceUpdate();

        const {current: refs} = React.useRef<RefsPages<Args, DataType>>({
            /* istanbul ignore next */
            onChange() {
                return false;
            },
            args: [],
            lastTimeCalled: 0,
            pageCount: 1,
        });

        const nextArgs = getAllArgs(getArgs, refs.pageCount);

        if (refs.pageCount !== 1 && refs.args[0] && nextArgs[0] && !shallowEqual(nextArgs[0], refs.args[0])) {
            refs.pageCount = 1;
            refs.args = nextArgs.slice(0, 1);
        } else {
            refs.args = nextArgs;
        }

        refs.onChange = function onChange(prevArgs, shouldCommit) {
            let matches = false;

            refs.args.forEach(args => {
                if (shallowEqual(args, prevArgs)) {
                    matches = true;
                }
            });

            if (matches && shouldCommit) {
                forceUpdate();
            }

            return matches;
        };

        useLazyRef(() => {
            if (options.refreshOnMount) {
                refs.args.forEach(args => {
                    resource.delete(args);
                });
            }
            resource.subscribe(refs);
        });

        React.useEffect(() => {
            return () => {
                resource.unsubscribe(refs);
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        const meta: ResultPagesMeta = {
            pending: false,
            fulfilled: false,
            rejected: false,
            reason: undefined,
            invalidate() {
                refs.args.forEach(args => {
                    resource.invalidate(args, false);
                    resource.read(args, {maxAge: options.refreshInterval});
                });
            },
            loadMore() {
                refs.pageCount += 1;
                forceUpdate();
            },
        };

        if (refs.args[0] === undefined) {
            return [undefined, meta];
        }

        const {lastTimeCalled, prevResult} = refs;
        const now = Date.now();
        refs.lastTimeCalled = now;

        /**
         * Should this call get debounced and rescheduled,
         * and return the previous value to reduce the amount of requests?
         *
         * We should debounce when all conditions are met:
         * 1. We are running in browser.
         * 2. Previous result is valid.
         * 3. Less than 150ms lapsed since the last call.
         * 4. The item is not in the cache.
         */
        const shouldDebounce =
            isBrowser &&
            !!prevResult &&
            now - lastTimeCalled < DEFAULT_DEBOUNCE_MS &&
            refs.args.reduce((anyNotCached, args) => anyNotCached || !resource.has(args), false);

        clearTimeout(refs.debounceTimerId);

        if (shouldDebounce) {
            refs.debounceTimerId = window.setTimeout(forceUpdate, DEFAULT_DEBOUNCE_MS);
            return prevResult as ResultPages<DataType>;
        }

        let data: DataType[] | undefined = [];

        for (const args of refs.args) {
            const ret = resource.read(args, {maxAge: options.refreshInterval});

            if (meta.rejected || meta.pending) {
                continue;
            }

            if (!ret || ret.status === Status.PENDING) {
                meta.pending = true;
                continue;
            }

            if (ret.status === Status.REJECTED) {
                meta.rejected = true;
                meta.reason = ret.reason;
                continue;
            }

            // fulfilled
            data.push(ret.data!);
        }

        if (!meta.pending && !meta.rejected) {
            meta.fulfilled = true;
        } else {
            data = prevResult ? prevResult[0] : undefined;
        }

        refs.prevResult = [data, meta];

        return refs.prevResult;
    };

    return useResource;
}
