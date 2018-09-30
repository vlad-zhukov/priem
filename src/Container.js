import memoize, {areKeysEqual, FULFILLED, REJECTED} from './memoize';
import * as promiseState from './promiseState';
import {assertType} from './helpers';

let store = {};

export function populateStore(initialStore) {
    assertType(initialStore, ['object'], "'initialStore'");
    Object.assign(store, initialStore);
}

export function flushStore() {
    const tmp = store;
    store = {};
    return tmp;
}

export class Container {
    constructor(options) {
        assertType(options, ['object'], "Container argument 'options'");

        const {promise, mapPropsToArgs, maxSize, maxAge, ssrKey} = options;

        assertType(promise, ['function'], "'promise'");
        assertType(mapPropsToArgs, ['function', 'undefined'], "'mapPropsToArgs'");
        assertType(ssrKey, ['string', 'undefined'], "'ssrKey'");

        this._mapPropsToArgs = mapPropsToArgs || (() => []);
        this._listeners = [];

        this._onCacheChange = this._onCacheChange.bind(this);

        const initialCache = store[ssrKey];
        store[ssrKey] = undefined;

        this._memoized = memoize({
            fn: promise,
            initialCache,
            maxSize,
            maxAge,
            onCacheChange: this._onCacheChange,
        });
    }

    _get(props, forceRefresh) {
        const args = this._mapPropsToArgs(props);
        assertType(args, ['array', 'null'], "The result of 'mapPropsToArgs(props)'");

        if (args === null) {
            return promiseState.pending();
        }

        const res = this._memoized(args, {forceRefresh});

        // TODO: remove this
        switch (res.status) {
            case FULFILLED:
                return promiseState.fulfilled(res.data);
            case REJECTED:
                return promiseState.rejected(res.reason);
            default:
                return promiseState.pending();
        }
    }

    _onCacheChange(args, forceRefresh) {
        this._listeners.forEach(comp => {
            const nextArgs = this._mapPropsToArgs(comp.props);
            if (nextArgs !== null && areKeysEqual(args, nextArgs)) {
                comp._update(forceRefresh);
            }
        });
    }

    _subscribe(component) {
        this._listeners.push(component);
    }

    _unsubscribe(component) {
        const index = this._listeners.findIndex(comp => comp === component);
        this._listeners.splice(index, 1);
    }
}
