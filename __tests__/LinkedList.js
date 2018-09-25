import {LinkedList, LinkedListNode} from '../src/LinkedList';

const createLinkedList = (size = 5) => {
    const nodes = [
        new LinkedListNode('foo', 123),
        new LinkedListNode('bar', 234),
        new LinkedListNode('baz', 345),
        new LinkedListNode('qux', 456),
        new LinkedListNode('quux', 567),
    ];
    return new LinkedList(nodes.slice(0, size));
};

it('should construct with nodes', () => {
    const list = createLinkedList(2);
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "foo",
    "value": 123,
  },
  "size": 2,
  "tail": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
}
`);
    expect(list.toArray()).toMatchInlineSnapshot(`
Array [
  LinkedListNode {
    "key": "foo",
    "value": 123,
  },
  LinkedListNode {
    "key": "bar",
    "value": 234,
  },
]
`);
});

it('should prepend nodes', () => {
    const list = new LinkedList();
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": null,
  "size": 0,
  "tail": null,
}
`);

    list.prepend(new LinkedListNode('foo', 123));
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "foo",
    "value": 123,
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": "foo",
    "value": 123,
  },
}
`);

    list.prepend(new LinkedListNode('bar', 234));
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
  "size": 2,
  "tail": LinkedListNode {
    "key": "foo",
    "value": 123,
  },
}
`);
});

it('should find a node by predicate', () => {
    const list = createLinkedList(2);
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "foo",
    "value": 123,
  },
  "size": 2,
  "tail": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
}
`);

    const res1 = list.findBy(node => node.key === 'foo');
    expect(res1).toMatchInlineSnapshot(`
LinkedListNode {
  "key": "foo",
  "value": 123,
}
`);

    const res2 = list.findBy(node => node.key === 'baz');
    expect(res2).toBeNull();

    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "foo",
    "value": 123,
  },
  "size": 2,
  "tail": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
}
`);
});

it('should delete a node by reference', () => {
    const list = createLinkedList(3);

    const res1 = list.findBy(node => node.key === 'foo');
    expect(res1).toMatchInlineSnapshot(`
LinkedListNode {
  "key": "foo",
  "value": 123,
}
`);

    const res2 = list.findBy(node => node.key === 'baz');
    expect(res2).toMatchInlineSnapshot(`
LinkedListNode {
  "key": "baz",
  "value": 345,
}
`);

    const del1 = list.delete(res1);
    expect(del1).toBe(res1);

    const del2 = list.delete(res2);
    expect(del2).toBe(res2);

    expect(list.toArray()).toMatchInlineSnapshot(`
Array [
  LinkedListNode {
    "key": "bar",
    "value": 234,
  },
]
`);
});

it('should delete a node by predicate', () => {
    const list = createLinkedList(2);
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "foo",
    "value": 123,
  },
  "size": 2,
  "tail": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
}
`);

    const res1 = list.deleteBy(node => node.key === 'foo');
    expect(res1).toMatchInlineSnapshot(`
LinkedListNode {
  "key": "foo",
  "value": 123,
}
`);

    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
}
`);

    const res2 = list.deleteBy(node => node.key === 'foo');
    expect(res2).toBeNull();

    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": "bar",
    "value": 234,
  },
}
`);
});