const NEXT = '@@next';
const PREV = '@@prev';

export class CacheItem<K = unknown, V = unknown> {
    key: K;
    value: V;
    [NEXT]: CacheItem<K, V> | null;
    [PREV]: CacheItem<K, V> | null;
    expireId?: number;
    lastRefreshAt?: number;

    constructor(key: K, value: V) {
        this.key = key;
        this.value = value;

        Object.defineProperties(this, {
            [NEXT]: {
                value: null,
                writable: true,
            },
            [PREV]: {
                value: null,
                writable: true,
            },
            expireId: {
                value: undefined,
                writable: true,
            },
            lastRefreshAt: {
                value: undefined,
                writable: true,
            },
        });
    }

    destroy(): void {
        this[NEXT] = null;
        this[PREV] = null;
        clearTimeout(this.expireId);
        this.expireId = undefined;
        this.lastRefreshAt = undefined;
    }
}

export type SerializableCacheItem<K = unknown, V = unknown> = {
    key: K;
    value: V;
};

const REDUCED = '@@reduced';

type ReducedType<ValueType> = {
    [REDUCED]: true;
    value: ValueType;
};

function reduced<ValueType>(value: ValueType): ReducedType<ValueType> {
    return {[REDUCED]: true, value};
}

function isReduced<ValueType>(value: any): value is ReducedType<ValueType> {
    return value && REDUCED in value;
}

export function reduce<ReturnType, K = unknown, V = unknown>(
    cache: Cache<K, V>,
    accumulator: ReturnType,
    iteratee: (result: ReturnType, item: CacheItem<K, V>) => ReturnType | ReducedType<ReturnType>
) {
    let item = cache.head;
    let result: ReturnType | ReducedType<ReturnType> = accumulator;
    while (item !== null) {
        result = iteratee(result, item);
        if (isReduced(result)) {
            return result.value;
        }
        item = item[NEXT];
    }
    return result;
}

export class Cache<K = unknown, V = unknown> {
    head: CacheItem<K, V> | null;
    tail: CacheItem<K, V> | null;
    size: number;

    constructor(items: (CacheItem<K, V> | SerializableCacheItem<K, V>)[]) {
        this.head = null;
        this.tail = null;
        this.size = 0;

        for (let i = items.length; i > 0; i--) {
            const item = items[i - 1];
            const cacheItem: CacheItem<K, V> =
                item instanceof CacheItem ? item : new CacheItem<K, V>(item.key, item.value);
            this.prepend(cacheItem);
        }
    }

    prepend(item: CacheItem<K, V>): void {
        item[NEXT] = this.head;
        if (this.head !== null) {
            this.head[PREV] = item;
        }
        this.head = item;
        if (this.tail === null) {
            this.tail = item;
        }
        this.size += 1;
    }

    // eslint-disable-next-line consistent-return
    remove(item: CacheItem<K, V> | null): null | void {
        if (item === null || !item.lastRefreshAt) {
            return null;
        }

        const next = item[NEXT];
        const prev = item[PREV];

        if (prev === null) {
            this.head = next;
        } else {
            prev[NEXT] = next;
        }
        if (next === null) {
            this.tail = prev;
        } else {
            next[PREV] = prev;
        }
        this.size -= 1;
    }

    findBy(predicate: (item: CacheItem<K, V>) => boolean): CacheItem<K, V> | null {
        return reduce<CacheItem<K, V> | null, K, V>(this, null, (acc, item) => (predicate(item) ? reduced(item) : acc));
    }
}
