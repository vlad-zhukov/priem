import moize from 'moize';
import {shallowEqual} from 'fast-equals';
import * as promiseState from './promiseState';
import {type, isBrowser} from './helpers';

export default class Cache {
    constructor({promise, maxAge, maxArgs, maxSize = Infinity, update, runAsync}) {
        this._update = update;
        this._maxArgs = type(maxArgs) === 'number' ? maxArgs : null;

        this.awaiting = [];
        this.rejected = false;
        this.prevArgs = null;

        this.memoized = moize(promise, {
            isPromise: true,
            maxAge,
            maxArgs,
            maxSize,
            onExpire: (args) => {
                if (shallowEqual(args, this.prevArgs)) {
                    runAsync();
                }
            },
        });
    }

    getAwaitingIndex(args) {
        for (let i = 0, l = this.awaiting.length; i < l; i++) {
            if (shallowEqual(this.awaiting[i], args)) {
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
        /* istanbul ignore next */
        if (index !== -1) {
            this.awaiting.splice(index, 1);
        }
    }

    run({args: allArgs, autoRefresh = true, isForced}) {
        const args = this._maxArgs !== null ? allArgs.slice(0, this._maxArgs) : allArgs;

        // Stop auto-refreshing
        if (!autoRefresh && !isForced) {
            return;
        }

        // Do not recall rejected (uncached) promises unless forced
        if (this.rejected && !isForced) {
            return;
        }

        if (this.isAwaiting(args)) {
            return;
        }

        let shouldUpdateState = true;

        this._update((s, m) => {
            const isFulfilled = !!s.fulfilled;
            const isSsr = !!(isFulfilled && m.ssr);

            if (this.memoized.has(args)) {
                // Do not recall memoized promises unless forced
                if (isFulfilled && !isForced && shallowEqual(args, this.prevArgs)) {
                    shouldUpdateState = false;
                    return null;
                }
            }
            else if (isSsr) {
                shouldUpdateState = false;
                this.memoized.add(args, Promise.resolve(s.value));
                this.prevArgs = args;
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

        this.prevArgs = args;

        if (isForced) {
            this.memoized.remove(args);
        }

        // eslint-disable-next-line consistent-return
        return this.memoized(...args)
            .then((result) => {
                this.removeAwaiting(args);
                this._update({
                    state: promiseState.fulfilled(result),
                    meta: {ssr: !isBrowser},
                });
            })
            .catch((e) => {
                this.removeAwaiting(args);
                this.rejected = true;
                this.prevArgs = null;
                this._update({
                    state: promiseState.rejected(e.message),
                    meta: {ssr: !isBrowser},
                });
            });
    }
}
