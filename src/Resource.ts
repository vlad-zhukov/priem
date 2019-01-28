import memoize, {
    MemoizedCache,
    MemoizedCacheItem,
    MemoizedFunction,
    MemoizedKey,
    MemoizedSerializableCacheItem,
    MemoizedValue,
    STATUS,
    toSerializableArray,
} from './memoize';
import {assertType, isBrowser, type} from './helpers';

let storeMap = new Map<string, MemoizedSerializableCacheItem[] | MemoizedCacheItem[] | MemoizedCache>();
export const renderPromises: (Promise<void> | undefined)[] = [];

export function populateStore(initialStore: [string, (MemoizedSerializableCacheItem | MemoizedCacheItem)[]][]): void {
    assertType(initialStore, ['array'], "'initialStore'");
    storeMap = new Map(initialStore);
}

function isSerializableCache(
    maybeCache: MemoizedSerializableCacheItem[] | MemoizedCache
): maybeCache is MemoizedSerializableCacheItem[] {
    return type(maybeCache) === 'array';
}

export function flushStore() {
    const store: [string, MemoizedSerializableCacheItem[]][] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [ssrKey, maybeCache] of storeMap.entries()) {
        const value = isSerializableCache(maybeCache) ? maybeCache : toSerializableArray(maybeCache, true);
        store.push([ssrKey, value]);
    }

    storeMap.clear(); // TODO: should flushing clear resources?
    renderPromises.splice(0);
    return store;
}

export type Subscriber = {
    onChange: (prevArgs: MemoizedKey, forceRefresh: boolean) => void;
};

type ResourceOptions = {
    maxSize?: number;
    maxAge?: number;
    ssrKey?: string;
};

// TODO: introduce a mechanism to dispose unneeded resource?
export class Resource {
    private _ssrKey?: string;
    private _listeners: Subscriber[];
    private _memoized: MemoizedFunction;

    constructor(fn: (...args: unknown[]) => Promise<unknown>, options: ResourceOptions = {}) {
        assertType(fn, ['function'], "'fn'");
        assertType(options, ['object'], "Resource argument 'options'");

        const {maxSize, maxAge, ssrKey} = options;

        assertType(ssrKey, ['string', 'undefined'], "'ssrKey'");

        this._ssrKey = ssrKey;
        this._listeners = [];

        this._onCacheChange = this._onCacheChange.bind(this);

        let initialCache: (MemoizedSerializableCacheItem | MemoizedCacheItem)[] | undefined;
        if (ssrKey) {
            // @ts-ignore
            initialCache = storeMap.get(ssrKey);
            storeMap.delete(ssrKey);
        }

        this._memoized = memoize({
            fn,
            initialCache,
            maxSize,
            maxAge,
            onCacheChange: this._onCacheChange,
        });
    }

    _has(args: MemoizedKey | null): boolean {
        if (args === null) {
            return false;
        }
        return this._memoized.has(args);
    }

    _get(args: MemoizedKey | null, forceRefresh: boolean = false): MemoizedValue | null {
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
                    'usePriem: Passing reference types (such as objects and arrays) to `fn` is ' +
                        "discouraged as it's error prone and is usually a cause of infinite rerenders. " +
                        'Please change this function signature to only use primitive types.'
                );
            }
        });

        const ret = this._memoized(args, forceRefresh);

        if (isBrowser === false && this._ssrKey) {
            const cache = storeMap.get(this._ssrKey);
            if (cache !== undefined && cache !== this._memoized.cache) {
                throw new TypeError(
                    `usePriem: A resource with '${this._ssrKey}' \`ssrKey\` already exists. ` +
                        'Please make sure `ssrKey`s are unique.'
                );
            } else {
                storeMap.set(this._ssrKey, this._memoized.cache);
            }
            if (ret.status === STATUS.PENDING) {
                renderPromises.push(ret.promise);
            }
        }

        return ret;
    }

    _onCacheChange(args: MemoizedKey, forceRefresh: boolean): void {
        this._listeners.forEach(comp => {
            comp.onChange(args, forceRefresh);
        });
    }

    _subscribe(component: Subscriber): void {
        // TODO: Handle cases when the same component subscribes multiple times?
        this._listeners.push(component);
    }

    _unsubscribe(component: Subscriber): void {
        const index = this._listeners.findIndex(copm => copm === component);
        this._listeners.splice(index, 1);
    }
}
