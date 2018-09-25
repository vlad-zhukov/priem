import {noop} from './utils';

const NEXT = '@next';
const PREV = '@prev';

function createTimeout(item, list) {
    // eslint-disable-next-line no-param-reassign
    item.timeoutId = setTimeout(() => {
        if (list.onExpire(item.key) === false) {
            createTimeout(item, list);
        } else {
            list.delete(item);
            list.onDelete();
        }
    }, list.maxAge);
}

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

const REDUCED = {};

const reduced = value => ({
    [REDUCED]: true,
    get() {
        return value;
    },
});

function reduce(list, ret, predicate) {
    let item = list.head;
    let result = ret;
    while (item !== null) {
        result = predicate(result, item);
        if (result && REDUCED in result) {
            return result.get();
        }
        item = item[NEXT];
    }
    return result;
}

export class Cache {
    constructor(items, options = {}) {
        this.head = null;
        this.tail = null;
        this.size = 0;

        if (Array.isArray(items)) {
            for (let i = items.length; i > 0; i--) {
                this.prepend(items[i - 1]);
            }
        }

        Object.defineProperties(this, {
            maxAge: {
                // eslint-disable-next-line no-restricted-globals
                value: options.maxAge && isFinite(options.maxAge) ? options.maxAge : null,
            },
            onExpire: {
                value: options.onExpire || noop,
            },
            onDelete: {
                value: options.onDelete || noop,
            },
        });
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

        this.hit(item);

        return item;
    }

    hit(item) {
        if (this.maxAge !== null) {
            clearTimeout(item.timeoutId);
            createTimeout(item, this);
        }
    }

    delete(item) {
        const next = item[NEXT];
        const prev = item[PREV];

        item.destroy();

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
        return item;
    }

    findBy(predicate) {
        return reduce(this, null, (ret, item) => (predicate(item) ? reduced(item) : ret));
    }

    deleteBy(predicate) {
        const item = this.findBy(predicate);
        if (item !== null) {
            this.delete(item);
        }
        return item;
    }

    toArray() {
        return reduce(this, [], (ret, item) => {
            ret.push(item);
            return ret;
        });
    }
}
