import moize from 'moize';
import {elementsEqual} from 'react-shallow-equal';
import * as promiseState from './promiseState';
import {isBrowser} from './helpers';

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

export default class Cache {
    constructor({promise, maxAge, maxArgs, maxSize = Infinity, update, runAsync}) {
        this._update = update;

        this.awaiting = [];
        this.rejected = false;
        this.prevArgs = null;

        this.memoized = moize(promise, {
            isPromise: true,
            maxAge,
            maxArgs,
            maxSize,
            onExpire: (args) => {
                if (arrayElementsEqual(args, this.prevArgs)) {
                    runAsync();
                }
            },
        });
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

    run({args, autoRefresh = true, isForced}) {
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
                if (isFulfilled && !isForced && arrayElementsEqual(args, this.prevArgs)) {
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
