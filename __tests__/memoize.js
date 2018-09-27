import delay from 'delay';
import memoize from '../src/memoize';

it('should memoize promises', async () => {
    const memoized = memoize({fn: name => delay(200, {value: `Hello ${name}!`}), maxSize: 2});

    expect(memoized.isMemoized).toBe(true);

    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello SpongeBob!",
}
`);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);
});

it('should not throw on rejected promises', async () => {
    const memoized = memoize({fn: name => delay.reject(200, {value: new Error(`Hello ${name}!`)}), maxSize: 2});

    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
  "value": null,
}
`);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
  "value": null,
}
`);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello SpongeBob!],
  "status": 2,
  "value": null,
}
`);
});

it('should default `maxSize` to 1', async () => {
    const memoized = memoize({
        fn: (name1, name2) =>
            delay(200, {
                value: `Hello ${name1}${name2 ? ` and ${name2}` : ''}!`,
            }),
    });

    memoized(['SpongeBob']);
    await delay(300);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
]
`);

    memoized(['SpongeBob', 'Patrick']);
    await delay(300);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
]
`);
});

it('should properly match equal keys', async () => {
    const memoized = memoize({fn: () => delay(200)});

    memoized([NaN, NaN]);
    memoized([NaN, NaN]);

    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
]
`);
});

it('should have a `maxAge` option', async () => {
    const onCacheChange = jest.fn();
    const memoized = memoize({fn: () => delay(200), maxSize: 2, onCacheChange, maxAge: 500});

    memoized(['SpongeBob']);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    await delay(300);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    memoized(['Patrick']);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
  CacheItem {
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
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(3);

    await delay(300);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
  CacheItem {
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
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(5);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
Cache {
  "head": CacheItem {
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
  "size": 2,
  "tail": CacheItem {
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
    expect(onCacheChange).toHaveBeenCalledTimes(6);
});

it('should not fail to expire if the key does not exist', async () => {
    const onCacheChange = jest.fn();
    const memoized = memoize({fn: () => delay(200), onCacheChange, maxAge: 500});

    memoized(['SpongeBob']);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    await delay(300);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
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
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    const itemToRemove = memoized.cache.tail;
    memoized.cache.remove(itemToRemove);
    itemToRemove.destroy();
    expect(memoized.cache).toMatchInlineSnapshot(`
Cache {
  "head": null,
  "size": 0,
  "tail": null,
}
`);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
Cache {
  "head": null,
  "size": 0,
  "tail": null,
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(2);
});

it('should refresh when called with `forceRefresh`', async () => {
    const onCacheChange = jest.fn();
    const memoized = memoize({fn: () => delay(200, {value: 'SquarePants'}), onCacheChange});

    memoized(['SpongeBob']);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    await delay(300);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": "SquarePants",
    },
  },
]
`);

    memoized(['SpongeBob'], {forceRefresh: true});
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 0,
      "value": "SquarePants",
    },
  },
]
`);

    await delay(300);
    expect(memoized.cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": "SquarePants",
    },
  },
]
`);
});
