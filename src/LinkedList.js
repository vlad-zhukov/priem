export class LinkedListNode {
    constructor(key, value, next = null) {
        this.key = key;
        this.value = value;
        this['@next'] = next;
    }
}

function iterate(list, predicate) {
    if (list.head === null) {
        return null;
    }
    let current = list.head;
    let prev = null;
    while (current !== null) {
        const result = predicate(current);
        if (result) {
            return {node: current, prev};
        }
        prev = current;
        current = current['@next'];
    }
    return null;
}

export class LinkedList {
    constructor(nodes) {
        this.head = null;
        this.tail = null;
        this.size = 0;

        if (nodes) {
            for (let i = nodes.length; i > 0; i--) {
                this.prepend(nodes[i - 1]);
            }
        }
    }

    prepend(node) {
        node['@next'] = this.head;
        this.head = node;
        this.size += 1;
        if (!this.tail) {
            this.tail = node;
        }
    }

    findBy(predicate) {
        const result = iterate(this, predicate);
        if (result) {
            return result.node;
        }
        return null;
    }

    deleteBy(predicate) {
        const result = iterate(this, predicate);
        if (result) {
            const {node, prev} = result;
            const next = node['@next'];
            if (!prev) {
                this.head = next;
            } else {
                prev['@next'] = next;
            }
            if (next === null) {
                this.tail = prev;
            }
            this.size -= 1;
            return result.node;
        }
        return null;
    }
}
