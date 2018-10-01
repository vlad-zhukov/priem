import memoize, {areKeysEqual, toSerializableArray} from './memoize';
import {assertType, isBrowser} from './helpers';

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
        this._ssrKey = ssrKey;
        this._listeners = [];

        this._onCacheChange = this._onCacheChange.bind(this);

        let initialCache;
        if (ssrKey) {
            initialCache = store[ssrKey];
            delete store[ssrKey];
        }

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
            return null;
        }

        const ret = this._memoized(args, {forceRefresh});
        if (isBrowser === false && this._ssrKey) {
            store[this._ssrKey] = toSerializableArray(this._memoized.cache);
        }
        return ret;
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
