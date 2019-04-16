import is, {TypeName} from '@sindresorhus/is';
import {
    MemoizedCache,
    MemoizedCacheItem,
    MemoizedFunction,
    MemoizedKey,
    MemoizedSerializableCacheItem,
    MemoizedValue,
    STATUS,
    toSerializableArray,
} from './MemoizedFunction';
import {areKeysEqual, assertType, isBrowser} from './utils';

let storeMap = new Map<string, MemoizedSerializableCacheItem[] | MemoizedCacheItem[] | MemoizedCache>();
export const renderPromises: (Promise<void>)[] = [];

export function populateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void {
    assertType(initialStore, [TypeName.Array], "'initialStore'");
    storeMap = new Map(initialStore);
}

function isSerializableCache(
    maybeCache: MemoizedSerializableCacheItem[] | MemoizedCache
): maybeCache is MemoizedSerializableCacheItem[] {
    return is.array(maybeCache);
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

export interface Subscriber<Args> {
    onChange: (prevArgs: Args, forceRefresh: boolean) => void;
}

export interface ResourceOptions {
    maxSize?: number;
    maxAge?: number;
    ssrKey?: string;
}

// TODO: introduce a mechanism to dispose unneeded resource?
export class Resource<Args extends MemoizedKey, DataType> {
    private readonly ssrKey?: string;
    private readonly listeners: Subscriber<Args>[] = [];
    private readonly memoized: MemoizedFunction<Args, DataType>;

    constructor(fn: (...args: Args) => Promise<DataType>, options: ResourceOptions) {
        assertType(fn, [TypeName.Function], "'fn'");
        assertType(options, [TypeName.Object], "Resource argument 'options'");

        const {maxSize, maxAge, ssrKey} = options;

        assertType(ssrKey, [TypeName.string, TypeName.undefined], "'ssrKey'");

        this.ssrKey = ssrKey;
        this.listeners = [];

        this.onCacheChange = this.onCacheChange.bind(this);

        let initialCache:
            | (MemoizedSerializableCacheItem<Args, DataType> | MemoizedCacheItem<Args, DataType>)[]
            | undefined;
        if (ssrKey) {
            // @ts-ignore
            initialCache = storeMap.get(ssrKey);
            storeMap.delete(ssrKey);
        }

        this.memoized = new MemoizedFunction<Args, DataType>({
            fn,
            initialCache,
            maxSize,
            maxAge,
            onCacheChange: this.onCacheChange,
        });
    }

    // remove(args: Args): void {
    //     this.memoized.has(args);
    // }

    has(args: Args | null): boolean {
        if (args === null) {
            return false;
        }
        return !!this.memoized.cache.findBy(cacheItem => areKeysEqual(cacheItem.key, args));
    }

    get(args: Args | null, forceRefresh: boolean = false): MemoizedValue | undefined {
        if (!isBrowser && !this.ssrKey) {
            return;
        }

        if (args === null) {
            return;
        }

        const ret = this.memoized.run(args, forceRefresh);

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

    onCacheChange(args: Args, forceRefresh: boolean): void {
        this.listeners.forEach(comp => {
            comp.onChange(args, forceRefresh);
        });
    }

    subscribe(component: Subscriber<Args>): void {
        // TODO: Handle cases when the same component subscribes multiple times?
        this.listeners.push(component);
    }

    unsubscribe(component: Subscriber<Args>): void {
        const index = this.listeners.findIndex(copm => copm === component);
        this.listeners.splice(index, 1);
    }
}
