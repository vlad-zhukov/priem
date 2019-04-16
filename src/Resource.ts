import memoize, {
    MemoizedCache,
    MemoizedCacheItem,
    MemoizedFunction,
    MemoizedKey,
    MemoizedValue,
    MemoizedSerializableCacheItem,
    STATUS,
    toSerializableArray,
} from './memoize';
import {assertType, isBrowser, type} from './utils';

let storeMap = new Map<string, MemoizedSerializableCacheItem[] | MemoizedCacheItem[] | MemoizedCache>();
export const renderPromises: (Promise<unknown>)[] = [];

export function populateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void {
    assertType(initialStore, ['array'], "'initialStore'");
    storeMap = new Map(initialStore);
}

function isSerializableCache(
    maybeCache: MemoizedSerializableCacheItem[] | MemoizedCache
): maybeCache is MemoizedSerializableCacheItem[] {
    return type(maybeCache) === 'array';
}

export function flushStore(): [string, MemoizedSerializableCacheItem[]][] {
    const store: [string, MemoizedSerializableCacheItem[]][] = [];
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

export type ResourceOptions = {
    maxSize?: number;
    maxAge?: number;
    ssrKey?: string;
};

// TODO: introduce a mechanism to dispose unneeded resource?
export class Resource<Args extends MemoizedKey> {
    /** @internal */ private readonly ssrKey?: string;
    /** @internal */ private readonly listeners: Subscriber[] = [];
    /** @internal */ private readonly memoized: MemoizedFunction;

    constructor(fn: (...args: Args) => Promise<unknown>, options: ResourceOptions) {
        assertType(fn, ['function'], "'fn'");
        assertType(options, ['object'], "Resource argument 'options'");

        const {maxSize, maxAge, ssrKey} = options;

        assertType(ssrKey, ['string', 'undefined'], "'ssrKey'");

        this.ssrKey = ssrKey;
        this.listeners = [];

        this.onCacheChange = this.onCacheChange.bind(this);

        let initialCache: (MemoizedSerializableCacheItem | MemoizedCacheItem)[] | undefined;
        if (ssrKey) {
            // @ts-ignore
            initialCache = storeMap.get(ssrKey);
            storeMap.delete(ssrKey);
        }

        this.memoized = memoize<Args>({
            fn,
            initialCache,
            maxSize,
            maxAge,
            onCacheChange: this.onCacheChange,
        });
    }

    /** @internal */
    has(args: Args | null): boolean {
        if (args === null) {
            return false;
        }
        return this.memoized.has(args);
    }

    /** @internal */
    get(args: Args | null, forceRefresh: boolean = false): MemoizedValue | null {
        if (!isBrowser && !this.ssrKey) {
            return null;
        }

        if (args === null) {
            return null;
        }

        const ret = this.memoized(args, forceRefresh);

        if (!isBrowser && this.ssrKey) {
            const cache = storeMap.get(this.ssrKey);
            if (cache !== undefined && cache !== this.memoized.cache) {
                throw new TypeError(
                    `usePriem: A resource with '${this.ssrKey}' \`ssrKey\` already exists. ` +
                        'Please make sure `ssrKey`s are unique.'
                );
            } else {
                storeMap.set(this.ssrKey, this.memoized.cache);
            }
            if (ret.status === STATUS.PENDING && ret.promise) {
                renderPromises.push(ret.promise);
            }
        }

        return ret;
    }

    /** @internal */
    onCacheChange(args: MemoizedKey, forceRefresh: boolean): void {
        this.listeners.forEach(comp => {
            comp.onChange(args, forceRefresh);
        });
    }

    /** @internal */
    subscribe(component: Subscriber): void {
        // TODO: Handle cases when the same component subscribes multiple times?
        this.listeners.push(component);
    }

    /** @internal */
    unsubscribe(component: Subscriber): void {
        const index = this.listeners.findIndex(copm => copm === component);
        this.listeners.splice(index, 1);
    }
}
