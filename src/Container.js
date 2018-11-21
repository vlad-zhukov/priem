import memoize, {PENDING, toSerializableArray} from './memoize';
import {type, assertType, isBrowser} from './helpers';

let storeMap = new Map();
export const renderPromises = [];

export function populateStore(initialStore) {
    assertType(initialStore, ['array'], "'initialStore'");
    storeMap = new Map(initialStore);
}

export function flushStore() {
    const store = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [ssrKey, maybeCache] of storeMap.entries()) {
        const value = type(maybeCache) === 'array' ? maybeCache : toSerializableArray(maybeCache, true);
        store.push([ssrKey, value]);
    }

    storeMap.clear(); // TODO: should flushing clear containers?
    renderPromises.splice(0);
    return store;
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
            initialCache = storeMap.get(ssrKey);
            storeMap.delete(ssrKey);
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
                    'usePriem: Passing reference types (such as objects and arrays) to `promise` function is ' +
                        "discouraged as it's very error prone and often causes infinite rerenders. " +
                        'Please change this function signature to only use primitive types.'
                );
            }
        });

        const ret = this._memoized(args, forceRefresh);
        if (isBrowser === false && this._ssrKey) {
            const cache = storeMap.get(this._ssrKey);
            if (cache !== undefined && cache !== this._memoized.cache) {
                throw new TypeError(
                    `usePriem: A container with '${this._ssrKey}' \`ssrKey\` already exists. ` +
                        'Please make sure `ssrKey`s are unique.'
                );
            } else {
                storeMap.set(this._ssrKey, this._memoized.cache);
            }
            if (ret.status === PENDING) {
                renderPromises.push(ret.promise);
            }
        }
        return ret;
    }

    _onCacheChange(args, forceRefresh) {
        this._listeners.forEach(comp => {
            comp.current(args, forceRefresh);
        });
    }

    _subscribe(component) {
        // TODO: Handle cases when the same component subscribes multiple times?
        this._listeners.push(component);
    }

    _unsubscribe(component) {
        const index = this._listeners.findIndex(copm => copm === component);
        this._listeners.splice(index, 1);
    }
}
