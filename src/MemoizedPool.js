import moize from 'moize';
import {elementsEqual} from 'react-shallow-equal';
import * as promiseState from './promiseState';
import {type, isBrowser} from './helpers';

export function extractAsyncValues(props) {
    if (type(props.asyncValues) !== 'function') {
        return {};
    }

    const values = props.asyncValues(props);

    const typeOfValues = type(values);
    if (typeOfValues !== 'object') {
        throw new TypeError(
            `Priem: property 'asyncValues' must be a function that returns an object, but got: '${typeOfValues}'.`
        );
    }

    return values;
}

export class MemoizedPool {
    constructor() {
        this.memoized = {};
        this.awaiting = {};
        this.rejected = {};
    }

    addMemoized(key, value, onExpire) {
        const typeOfValue = type(value);
        if (typeOfValue !== 'object') {
            throw new TypeError(
                `Priem: argument 'values' must return an object of objects, but got: '${typeOfValue}'.`
            );
        }

        const typeOfValuePromise = type(value.promise);
        if (typeOfValuePromise !== 'function') {
            throw new TypeError(
                "Priem: argument 'values' must return an object of objects with a property 'promise' " +
                    `each, but got: '${typeOfValuePromise}'.`
            );
        }

        this.awaiting[key] = [];
        this.rejected[key] = false;
        this.memoized[key] = moize(value.promise, {
            isPromise: true,
            maxAge: value.maxAge,
            maxArgs: value.maxArgs,
            maxSize: value.maxSize,
            onExpire,
        });
    }

    isMemoized(key, args) {
        if (!this.memoized[key]) {
            return false;
        }

        return this.memoized[key].has(args);
    }

    getAwaitingIndex(key, args) {
        for (let i = 0, l = this.awaiting[key].length; i < l; i++) {
            if (elementsEqual(this.awaiting[key][i], args)) {
                return i;
            }
        }

        return -1;
    }

    isAwaiting(key, args) {
        return this.getAwaitingIndex(key, args) !== -1;
    }

    removeAwaiting(key, args) {
        const index = this.getAwaitingIndex(key, args);
        if (index !== -1) {
            this.awaiting[key].splice(index, 1);
        }
    }

    runPromise({key, value, publicKey, isForced, update, onExpire}) {
        const args = type(value.args) === 'array' ? value.args : [];

        if (!this.memoized[key]) {
            this.addMemoized(key, value, onExpire);
        }

        // Do not recall rejected (uncached) promises unless forced
        if (this.rejected[key] && !isForced) {
            return;
        }

        if (this.isAwaiting(key, args)) {
            return;
        }

        return update((s, m) => {
            const hasData = !!s?.[publicKey]?.value;
            const isSsr = !!(hasData && m?.[publicKey]?.ssr);

            if (this.isMemoized(key, args)) {
                // Do not recall memoized promises unless forced
                if (hasData && !isForced) {
                    return;
                }
            }
            else if (isSsr) {
                this.memoized[key].add(args, Promise.resolve(s[publicKey].value));
                return {
                    meta: {[publicKey]: {ssr: false}},
                };
            }

            this.awaiting[key].unshift(args);
            this.rejected[key] = false;

            if (hasData) {
                return {
                    data: {
                        [publicKey]: promiseState.refreshing(s[publicKey]),
                    },
                };
            }

            return {
                data: {
                    [publicKey]: promiseState.pending(),
                },
            };
        }).then((s) => {
            if (s) {
                return this.memoized[key](...args)
                    .then((result) => {
                        this.removeAwaiting(key, args);
                        return update({
                            data: {[publicKey]: promiseState.fulfilled(result)},
                            meta: {[publicKey]: {ssr: !isBrowser}},
                        });
                    })
                    .catch((e) => {
                        this.removeAwaiting(key, args);
                        this.rejected[key] = true;
                        return update({
                            data: {[publicKey]: promiseState.rejected(e.message)},
                            meta: {[publicKey]: {ssr: !isBrowser}},
                        });
                    });
            }
        });
    }

    runPromises({props, isForced, update, onExpire}) {
        // Stop auto-refreshing
        if (!props.autoRefresh && !isForced) {
            return;
        }

        const asyncValues = extractAsyncValues(props);

        const values = Object.keys(asyncValues).map(key =>
            this.runPromise({
                key: `${key}@${props.name}`,
                value: asyncValues[key],
                publicKey: key,
                isForced,
                update,
                onExpire,
            })
        );

        return Promise.all(values);
    }
}
