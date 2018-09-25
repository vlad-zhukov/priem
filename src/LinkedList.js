const NEXT = '@next';
const PREV = '@prev';

export class LinkedListNode {
    constructor(key, value, next = null, prev = null) {
        this.key = key;
        this.value = value;

        Object.defineProperties(this, {
            [NEXT]: {
                value: next,
                writable: true,
            },
            [PREV]: {
                value: prev,
                writable: true,
            },
        });
    }
}

const hasProp = Object.hasOwnProperty;
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
        if (result && hasProp.call(result, REDUCED)) {
            return result.get();
        }
        node = node[NEXT];
    }
    return result;
}

export class LinkedList {
    constructor(nodes) {
        this.head = null;
        this.tail = null;
        this.size = 0;

        if (Array.isArray(nodes)) {
            for (let i = nodes.length; i > 0; i--) {
                this.prepend(nodes[i - 1]);
            }
        }
    }

    prepend(node) {
        node[NEXT] = this.head; // eslint-disable-line no-param-reassign
        if (this.head !== null) {
            this.head[PREV] = node;
        }
        this.head = node;
        this.size += 1;
        if (this.tail === null) {
            this.tail = node;
        }
        return node;
    }

    delete(node) {
        const next = node[NEXT];
        const prev = node[PREV];
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
