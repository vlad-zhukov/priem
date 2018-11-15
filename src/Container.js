import memoize, {toSerializableArray} from './memoize';
import {type, assertType, isBrowser} from './helpers';

let store = {};

export function populateStore(initialStore) {
    assertType(initialStore, ['object'], "'initialStore'");
    Object.assign(store, initialStore);
}

export function flushStore() {
    // TODO: register containers and throw a error when trying to register a container with the same ssrKey
    // TODO: should flushing clear containers?
    const tmp = store;
    store = {};
    return tmp;
}

// TODO: introduce a mechanism to dispose unneeded containers?
export class Container {
    constructor(options) {
        assertType(options, ['object'], "Container argument 'options'");

        const {promise, maxSize, maxAge, ssrKey} = options;

        assertType(promise, ['function'], "'promise'");
        assertType(ssrKey, ['string', 'undefined'], "'ssrKey'");

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

    _get(args, forceRefresh) {
        if (isBrowser === false && !this._ssrKey) {
            return null;
        }

        if (args === null) {
            return null;
        }

        args.forEach(arg => {
            const typeOfArg = type(arg);
            if (typeOfArg === 'object' || typeOfArg === 'array') {
                throw new TypeError(
                    'Priem: Passing reference types (such as objects and arrays) to `promise` function is ' +
                        "discouraged as it's very error prone and often causes infinite rerenders. " +
                        'Please change this function signature to only use primitive types.'
                );
            }
        });

        const ret = this._memoized(args, forceRefresh);
        if (isBrowser === false && this._ssrKey) {
            store[this._ssrKey] = toSerializableArray(this._memoized.cache, true);
        }
        return ret;
    }

    _onCacheChange(args, forceRefresh) {
        this._listeners.forEach(comp => {
            comp.current(args, forceRefresh);
        });
    }

    _subscribe(component) {
        this._listeners.push(component);
    }

    _unsubscribe(component) {
        const index = this._listeners.findIndex(copm => copm === component);
        this._listeners.splice(index, 1);
    }
}
