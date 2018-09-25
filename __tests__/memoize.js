import delay from 'delay';
import memoize from '../src/memoize';

it('should memoize promises', async () => {
    const memoized = memoize(name => delay(200, {value: `Hello ${name}!`}), {maxSize: 2});

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);
    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);
    expect(memoized('SpongeBob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized('SpongeBob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello SpongeBob!",
}
`);
    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);
});

it('should not throw on rejected promises', async () => {
    const memoized = memoize(name => delay.reject(200, {value: new Error(`Hello ${name}!`)}), {maxSize: 2});

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
  "value": null,
}
`);
    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
  "value": null,
}
`);
    expect(memoized('SpongeBob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized('SpongeBob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello SpongeBob!],
  "status": 2,
  "value": null,
}
`);
});

it('should default `maxSize` to 1', async () => {
    const memoized = memoize((name1, name2) =>
        delay(200, {
            value: `Hello ${name1}${name2 ? ` and ${name2}` : ''}!`,
        })
    );

    memoized('SpongeBob');
    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": "Hello SpongeBob!",
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": "Hello SpongeBob!",
    },
  },
}
`);

    memoized('SpongeBob', 'Patrick');
    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
      "Patrick",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": "Hello SpongeBob and Patrick!",
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
      "Patrick",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": "Hello SpongeBob and Patrick!",
    },
  },
}
`);
});

it('should properly match equal keys', async () => {
    const memoized = memoize(() => delay(200));

    memoized(NaN, NaN);
    memoized(NaN, NaN);

    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      NaN,
      NaN,
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 0,
      "value": null,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      NaN,
      NaN,
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 0,
      "value": null,
    },
  },
}
`);
});

it('should have a `maxAge` option', async () => {
    const onCacheChange = jest.fn();
    const onExpire = jest.fn();
    const memoized = memoize(() => delay(200), {maxSize: 2, onCacheChange, maxAge: 500, onExpire});

    memoized('SpongeBob');
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 0,
      "value": null,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 0,
      "value": null,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    memoized('Patrick');
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "Patrick",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 0,
      "value": null,
    },
  },
  "size": 2,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(3);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "Patrick",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "Patrick",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(5);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": null,
  "size": 0,
  "tail": null,
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(6);
    expect(onExpire).toHaveBeenCalledTimes(2);
});

it('should not expire keys if `onExpire` returns false', async () => {
    const onCacheChange = jest.fn();
    const onExpire = jest.fn(() => false);
    const memoized = memoize(() => delay(200), {onCacheChange, maxAge: 500, onExpire});

    memoized('SpongeBob');
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(4);
    expect(onExpire).toHaveBeenCalledTimes(1);
});

it('should not expire keys if the key has been hit recently and `updateExpire` is true', async () => {
    const onCacheChange = jest.fn();
    const onExpire = jest.fn();
    const memoized = memoize(() => delay(200), {onCacheChange, maxAge: 500, onExpire, updateExpire: true});

    memoized('SpongeBob');
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
});

it('should not fail to expire if the key does not exist', async () => {
    const onCacheChange = jest.fn();
    const onExpire = jest.fn();
    const memoized = memoize(() => delay(200), {onCacheChange, maxAge: 500, onExpire});

    memoized('SpongeBob');
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
  "size": 1,
  "tail": LinkedListNode {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": undefined,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    memoized.cache.deleteBy(node => node['@next'] === null);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": null,
  "size": 0,
  "tail": null,
}
`);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
LinkedList {
  "head": null,
  "size": 0,
  "tail": null,
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
});

it('should export `isMemoized` and `options`', async () => {
    const memoized = memoize(() => delay(200));

    expect(memoized.isMemoized).toBe(true);
    expect(memoized.options).toMatchInlineSnapshot(`
Object {
  "isEqual": [Function],
  "maxAge": Infinity,
  "maxSize": 1,
  "onCacheAdd": [Function],
  "onCacheChange": [Function],
  "onCacheHit": [Function],
  "onExpire": [Function],
  "updateExpire": false,
}
`);
});
