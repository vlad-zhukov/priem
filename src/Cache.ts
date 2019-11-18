const NEXT = '@@next';
const PREV = '@@prev';

export class CacheItem<K, V> {
    key: K;
    value: V;
    [NEXT]: CacheItem<K, V> | undefined;
    [PREV]: CacheItem<K, V> | undefined;
    isValid!: boolean;
    expireTimerId: number | undefined;
    lastUpdateAt: number | undefined;

    constructor(key: K, value: V) {
        this.key = key;
        this.value = value;

        Object.defineProperties(this, {
            [NEXT]: {
                value: undefined,
                writable: true,
            },
            [PREV]: {
                value: undefined,
                writable: true,
            },
            isValid: {
                value: false,
                writable: true,
            },
            expireTimerId: {
                value: undefined,
                writable: true,
            },
            lastUpdateAt: {
                value: undefined,
                writable: true,
            },
        });
    }

    destroy(): void {
        delete this.key;
        delete this.value;
        this[NEXT] = undefined;
        this[PREV] = undefined;
        this.isValid = false;
        clearTimeout(this.expireTimerId);
        this.expireTimerId = undefined;
        this.lastUpdateAt = undefined;
    }
}

export interface SerializableCacheItem<K, V> {
    key: K;
    value: V;
}

const REDUCED = '@@reduced';

interface ReducedType<ValueType> {
    [REDUCED]: true;
    value: ValueType;
}

function reduced<ValueType>(value: ValueType): ReducedType<ValueType> {
    return {[REDUCED]: true, value};
}

function isReduced<ValueType>(value: any): value is ReducedType<ValueType> {
    return value && REDUCED in value;
}

export function reduce<ReturnType, K, V>(
    cache: Cache<K, V>,
    accumulator: ReturnType,
    iteratee: (result: ReturnType, item: CacheItem<K, V>) => ReturnType | ReducedType<ReturnType>,
) {
    let item = cache.head;
    let result: ReturnType | ReducedType<ReturnType> = accumulator;
    while (item) {
        result = iteratee(result, item);
        if (isReduced(result)) {
            return result.value;
        }
        item = item[NEXT];
    }
    return result;
}

export class Cache<K, V> {
    head: CacheItem<K, V> | undefined;
    tail: CacheItem<K, V> | undefined;
    size = 0;

    constructor(items: (CacheItem<K, V> | SerializableCacheItem<K, V>)[]) {
        const now = Date.now();

        for (let i = items.length; i > 0; i--) {
            const item = items[i - 1];
            const cacheItem: CacheItem<K, V> =
                item instanceof CacheItem ? item : new CacheItem<K, V>(item.key, item.value);
            cacheItem.isValid = true;
            cacheItem.lastUpdateAt = now;
            this.prepend(cacheItem);
        }
    }

    prepend(item: CacheItem<K, V>): void {
        item[NEXT] = this.head;
        if (this.head) {
            this.head[PREV] = item;
        }
        this.head = item;
        if (!this.tail) {
            this.tail = item;
        }
        this.size += 1;
    }

    remove(item: CacheItem<K, V>): boolean {
        if (!item.key) {
            return false;
        }

        const next = item[NEXT];
        const prev = item[PREV];

        if (prev) {
            prev[NEXT] = next;
        } else {
            this.head = next;
        }

        if (next) {
            next[PREV] = prev;
        } else {
            this.tail = prev;
        }

        this.size -= 1;

        return true;
    }

    findBy(predicate: (item: CacheItem<K, V>) => boolean): CacheItem<K, V> | undefined {
        return reduce<CacheItem<K, V> | undefined, K, V>(this, undefined, (acc, item) =>
            predicate(item) ? reduced(item) : acc,
        );
    }
}
