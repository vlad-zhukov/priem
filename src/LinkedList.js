import {noop} from './utils';

const NEXT = '@next';
const PREV = '@prev';

function createTimeout(node, list) {
    // eslint-disable-next-line no-param-reassign
    node.timeoutId = setTimeout(() => {
        if (list.onExpire(node.key) === false) {
            createTimeout(node, list);
        } else {
            list.delete(node);
            list.onDelete();
        }
    }, list.maxAge);
}

export class LinkedListNode {
    constructor({key, value}) {
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
    let node = list.head;
    let result = ret;
    while (node !== null) {
        result = predicate(result, node);
        if (result && REDUCED in result) {
            return result.get();
        }
        node = node[NEXT];
    }
    return result;
}

export class LinkedList {
    constructor(nodes, options = {}) {
        this.head = null;
        this.tail = null;
        this.size = 0;

        if (Array.isArray(nodes)) {
            for (let i = nodes.length; i > 0; i--) {
                this.prepend(nodes[i - 1]);
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

    prepend(node) {
        node[NEXT] = this.head; // eslint-disable-line no-param-reassign
        if (this.head !== null) {
            this.head[PREV] = node;
        }
        this.head = node;
        if (this.tail === null) {
            this.tail = node;
        }
        this.size += 1;

        this.hit(node);

        return node;
    }

    hit(node) {
        if (this.maxAge !== null) {
            clearTimeout(node.timeoutId);
            createTimeout(node, this);
        }
    }

    delete(node) {
        const next = node[NEXT];
        const prev = node[PREV];

        node.destroy();

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
        return node;
    }

    findBy(predicate) {
        return reduce(this, null, (ret, node) => (predicate(node) ? reduced(node) : ret));
    }

    deleteBy(predicate) {
        const node = this.findBy(predicate);
        if (node !== null) {
            this.delete(node);
        }
        return node;
    }

    toArray() {
        return reduce(this, [], (ret, node) => {
            ret.push(node);
            return ret;
        });
    }
}
