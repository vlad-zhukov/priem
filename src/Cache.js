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
            timeoutId: {
                value: null,
                writable: true,
            },
            used: {
                value: false,
                writable: true,
            },
        });
    }

    destroy() {
        this[NEXT] = null;
        this[PREV] = null;
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
        this.used = false;
    }
}

const REDUCED = '@@reduced';
const reduced = value => ({[REDUCED]: true, value});
function reduce(cache, accumulator, iteratee) {
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
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    static fromArray(items) {
        const cache = new Cache();
        for (let i = items.length; i > 0; i--) {
            cache.prepend(items[i - 1]);
        }
        return cache;
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
        item.used = true; // eslint-disable-line no-param-reassign
    }

    remove(item) {
        if (item === null || item.used === false) {
            return;
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

    toArray() {
        return reduce(this, [], (acc, item) => {
            acc.push(item);
            return acc;
        });
    }
}
