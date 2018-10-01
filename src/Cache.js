const NEXT = '@@next';
const PREV = '@@prev';

export class CacheItem {
    constructor(key, value) {
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
                value: null,
                writable: true,
            },
            lastRefreshAt: {
                value: null,
                writable: true,
            },
        });
    }

    destroy() {
        this[NEXT] = null;
        this[PREV] = null;
        clearTimeout(this.expireId);
        this.expireId = null;
        this.lastRefreshAt = null;
    }
}

const REDUCED = '@@reduced';
const reduced = value => ({[REDUCED]: true, value});
export function reduce(cache, accumulator, iteratee) {
    let item = cache.head;
    let result = accumulator;
    while (item !== null) {
        result = iteratee(result, item);
        if (result && REDUCED in result) {
            return result.value;
        }
        item = item[NEXT];
    }
    return result;
}

export class Cache {
    constructor(items) {
        this.head = null;
        this.tail = null;
        this.size = 0;

        for (let i = items.length; i > 0; i--) {
            let item = items[i - 1];
            if (!(item instanceof CacheItem)) {
                item = new CacheItem(item.key, item.value);
            }
            this.prepend(item);
        }
    }

    prepend(item) {
        item[NEXT] = this.head; // eslint-disable-line no-param-reassign
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
    remove(item) {
        if (item === null || item.lastRefreshAt === null) {
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

    findBy(predicate) {
        return reduce(this, null, (acc, item) => (predicate(item) ? reduced(item) : acc));
    }
}
