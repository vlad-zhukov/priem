import moize from 'moize';
import {elementsEqual} from 'react-shallow-equal';
import * as promiseState from './promiseState';
import {type, assertType, isBrowser} from './helpers';

function arrayElementsEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

export const defaultAsyncValueOptions = {autoRefresh: true, maxSize: Infinity};

export default class Cache {
    constructor() {
        this.memoized = null;
        this.awaiting = [];
        this.rejected = false;
        this.prevArgs = null;
    }

    add(value, onExpire) {
        assertType(value, ['object'], "'getAsyncValue() -> value'");
        assertType(value.promise, ['function'], "'getAsyncValue() -> value.promise'");

        this.memoized = moize(value.promise, {
            isPromise: true,
            maxAge: value.maxAge,
            maxArgs: value.maxArgs,
            maxSize: value.maxSize,
            onExpire,
        });
    }

    isMemoized(args) {
        if (!this.memoized) {
            return false;
        }

        return this.memoized.has(args);
    }

    getAwaitingIndex(args) {
        for (let i = 0, l = this.awaiting.length; i < l; i++) {
            if (elementsEqual(this.awaiting[i], args)) {
                return i;
            }
        }

        return -1;
    }

    isAwaiting(args) {
        return this.getAwaitingIndex(args) !== -1;
    }

    removeAwaiting(args) {
        const index = this.getAwaitingIndex(args);
        if (index !== -1) {
            this.awaiting.splice(index, 1);
        }
    }

    run({asyncValue, isForced, update, onExpire}) {
        const value = {...defaultAsyncValueOptions, ...asyncValue};

        // Stop auto-refreshing
        if (!value.autoRefresh && !isForced) {
            return;
        }

        const args = type(value.args) === 'array' ? value.args : [];

        if (!this.memoized) {
            this.add(value, onExpire);
        }

        // Do not recall rejected (uncached) promises unless forced
        if (this.rejected && !isForced) {
            return;
        }

        if (this.isAwaiting(args)) {
            return;
        }

        let shouldUpdateState = true;

        // eslint-disable-next-line consistent-return
        update((s, m) => {
            const isFulfilled = !!s.fulfilled;
            const isSsr = !!(isFulfilled && m.ssr);

            if (this.isMemoized(args)) {
                // Do not recall memoized promises unless forced
                if (isFulfilled && !isForced && arrayElementsEqual(args, this.prevArgs)) {
                    shouldUpdateState = false;
                    return null;
                }
            }
            else if (isSsr) {
                shouldUpdateState = false;
                this.memoized.add(args, Promise.resolve(s.value));
                this.prevArgs = args;
                // eslint-disable-next-line consistent-return
                return {
                    meta: {ssr: false},
                };
            }

            this.awaiting.unshift(args);
            this.rejected = false;

            if (isFulfilled) {
                return {
                    state: promiseState.refreshing(s),
                };
            }

            return {
                state: promiseState.pending(),
            };
        });

        if (!shouldUpdateState) {
            return;
        }

        if (isForced) {
            this.memoized.remove(args);
        }

        // eslint-disable-next-line consistent-return
        return this.memoized(...args)
            .then((result) => {
                this.removeAwaiting(args);
                this.prevArgs = args;
                update({
                    state: promiseState.fulfilled(result),
                    meta: {ssr: !isBrowser},
                });
            })
            .catch((e) => {
                this.removeAwaiting(args);
                this.rejected = true;
                this.prevArgs = null;
                update({
                    state: promiseState.rejected(e.message),
                    meta: {ssr: !isBrowser},
                });
            });
    }
}
