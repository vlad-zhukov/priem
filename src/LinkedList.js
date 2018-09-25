const NEXT = '@next';
const PREV = '@prev';

function createTimeout(node, maxAge, onExpire, deleteNode) {
    // eslint-disable-next-line no-param-reassign
    node.timeoutId = setTimeout(() => {
        if (typeof onExpire === 'function' && onExpire(node.key) === false) {
            createTimeout(node, maxAge, onExpire, deleteNode);
        } else {
            deleteNode(node);
        }
    }, maxAge);
}

export class LinkedListNode {
    constructor({key, value, maxAge = null, onExpire, deleteNode}) {
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
            maxAge: {
                value: maxAge,
            },
            onExpire: {
                value: onExpire,
                writable: true,
            },
            deleteNode: {
                value: deleteNode,
                writable: true,
            },
            timeoutId: {
                value: null,
                writable: true,
            },
        });

        // eslint-disable-next-line no-restricted-globals
        if (maxAge && isFinite(maxAge)) {
            createTimeout(this, maxAge, onExpire, deleteNode);
        }
    }

    hit() {
        // eslint-disable-next-line no-restricted-globals
        if (this.maxAge && isFinite(this.maxAge)) {
            clearTimeout(this.timeoutId);
            createTimeout(this, this.maxAge, this.onExpire, this.deleteNode);
        }
    }

    destroy() {
        this[NEXT] = null;
        this[PREV] = null;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        // this.onExpire = undefined;
        // this.deleteNode = undefined;
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
        if (this.tail === null) {
            this.tail = node;
        }
        this.size += 1;
        return node;
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
