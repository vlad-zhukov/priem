import {LinkedList, LinkedListNode} from '../src/LinkedList';

it('should construct with nodes', () => {
    const list = new LinkedList([new LinkedListNode('foo', 'bar'), new LinkedListNode('baz', 'qux')]);
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": LinkedListNode {
      "@next": null,
      "key": "baz",
      "value": "qux",
    },
    "key": "foo",
    "value": "bar",
  },
  "size": 2,
  "tail": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
}
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

    list.prepend(new LinkedListNode('foo', 'bar'));
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": null,
    "key": "foo",
    "value": "bar",
  },
  "size": 1,
  "tail": LinkedListNode {
    "@next": null,
    "key": "foo",
    "value": "bar",
  },
}
`);

    list.prepend(new LinkedListNode('baz', 'qux'));
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": LinkedListNode {
      "@next": null,
      "key": "foo",
      "value": "bar",
    },
    "key": "baz",
    "value": "qux",
  },
  "size": 2,
  "tail": LinkedListNode {
    "@next": null,
    "key": "foo",
    "value": "bar",
  },
}
`);
});

it('should find a node by predicate', () => {
    const list = new LinkedList([new LinkedListNode('foo', 'bar'), new LinkedListNode('baz', 'qux')]);
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": LinkedListNode {
      "@next": null,
      "key": "baz",
      "value": "qux",
    },
    "key": "foo",
    "value": "bar",
  },
  "size": 2,
  "tail": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
}
`);

    const res1 = list.findBy(node => node.key === 'foo');
    expect(res1).toMatchInlineSnapshot(`
LinkedListNode {
  "@next": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
  "key": "foo",
  "value": "bar",
}
`);

    const res2 = list.findBy(node => node.key === 'bar');
    expect(res2).toBeNull();

    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": LinkedListNode {
      "@next": null,
      "key": "baz",
      "value": "qux",
    },
    "key": "foo",
    "value": "bar",
  },
  "size": 2,
  "tail": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
}
`);
});

it('should delete a node by predicate', () => {
    const list = new LinkedList([new LinkedListNode('foo', 'bar'), new LinkedListNode('baz', 'qux')]);
    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": LinkedListNode {
      "@next": null,
      "key": "baz",
      "value": "qux",
    },
    "key": "foo",
    "value": "bar",
  },
  "size": 2,
  "tail": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
}
`);

    const res1 = list.deleteBy(node => node.key === 'foo');
    expect(res1).toMatchInlineSnapshot(`
LinkedListNode {
  "@next": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
  "key": "foo",
  "value": "bar",
}
`);

    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
  "size": 1,
  "tail": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
}
`);

    const res2 = list.deleteBy(node => node.key === 'foo');
    expect(res2).toBeNull();

    expect(list).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
  "size": 1,
  "tail": LinkedListNode {
    "@next": null,
    "key": "baz",
    "value": "qux",
  },
}
`);
});
