import {type} from './helpers';

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
        });
    }

    destroy() {
        this[NEXT] = null;
        this[PREV] = null;
        clearTimeout(this.timeoutId);
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

/* eslint-disable no-param-reassign */
function prepend(cache, item) {
    item[NEXT] = cache.head;
    if (cache.head !== null) {
        cache.head[PREV] = item;
    }
    cache.head = item;
    if (cache.tail === null) {
        cache.tail = item;
    }
    cache.size += 1;
}

function remove(cache, item) {
    const next = item[NEXT];
    const prev = item[PREV];

    if (prev === null) {
        cache.head = next;
    } else {
        prev[NEXT] = next;
    }
    if (next === null) {
        cache.tail = prev;
    } else {
        next[PREV] = prev;
    }
    cache.size -= 1;
}
/* eslint-enable no-param-reassign */

export class Cache {
    constructor(options = {}) {
        this.head = null;
        this.tail = null;
        this.size = 0;

        Object.defineProperties(this, {
            onCacheChange: {
                value: options.onCacheChange,
            },
            maxAge: {
                // eslint-disable-next-line no-restricted-globals
                value: type(options.maxAge) === 'number' && isFinite(options.maxAge) ? options.maxAge : null,
            },
        });
    }

    static fromArray(items, options) {
        const cache = new Cache(options);
        for (let i = items.length; i > 0; i--) {
            cache.prepend(items[i - 1]);
        }
        return cache;
    }

    prepend(item) {
        prepend(this, item);

        if (this.maxAge !== null) {
            clearTimeout(item.timeoutId);
            // eslint-disable-next-line no-param-reassign
            item.timeoutId = setTimeout(() => {
                this.remove(item);
            }, this.maxAge);
        }

        this.onCacheChange();
    }

    remove(item) {
        remove(this, item);
        item.destroy();
        this.onCacheChange();
    }

    moveToHead(item) {
        remove(this, item);
        prepend(this, item);
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
