import delay from 'delay';
import memoize, {toSerializableArray} from '../memoize';

it('should memoize promises', async () => {
    const memoized = memoize({fn: name => delay(200, {value: `Hello ${name}!`}), maxSize: 2});

    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": null,
  "status": 0,
}
`);

    await delay(300);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "data": "Hello world!",
  "promise": Promise {},
  "reason": null,
  "status": 1,
}
`);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "data": "Hello world!",
  "promise": Promise {},
  "reason": null,
  "status": 1,
}
`);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": null,
  "status": 0,
}
`);

    await delay(300);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "data": "Hello SpongeBob!",
  "promise": Promise {},
  "reason": null,
  "status": 1,
}
`);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "data": "Hello world!",
  "promise": Promise {},
  "reason": null,
  "status": 1,
}
`);
});

it('should not throw on rejected promises', async () => {
    const memoized = memoize({fn: name => delay.reject(200, {value: new Error(`Hello ${name}!`)}), maxSize: 2});

    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": null,
  "status": 0,
}
`);

    await delay(300);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
}
`);
    expect(memoized(['world'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
}
`);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": null,
  "status": 0,
}
`);

    await delay(300);
    expect(memoized(['SpongeBob'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": [Error: Hello SpongeBob!],
  "status": 2,
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
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": "Hello SpongeBob!",
      "reason": null,
      "status": 1,
    },
  },
]
`);

    memoized(['SpongeBob', 'Patrick']);
    await delay(300);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
      "Patrick",
    ],
    "value": Object {
      "data": "Hello SpongeBob and Patrick!",
      "reason": null,
      "status": 1,
    },
  },
]
`);
});

it('should properly match equal keys', async () => {
    const memoized = memoize({fn: () => delay(200)});

    memoized([NaN, NaN]);
    memoized([NaN, NaN]);

    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      NaN,
      NaN,
    ],
    "value": Object {
      "data": null,
      "reason": null,
      "status": 0,
    },
  },
]
`);
});

it('should have a `maxAge` option', async () => {
    const onCacheChange = jest.fn();
    const memoized = memoize({fn: () => delay(200), maxSize: 2, onCacheChange, maxAge: 500});

    memoized(['SpongeBob']);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": null,
      "reason": null,
      "status": 0,
    },
  },
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(0);

    await delay(300);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": undefined,
      "reason": null,
      "status": 1,
    },
  },
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    memoized(['Patrick']);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "Patrick",
    ],
    "value": Object {
      "data": null,
      "reason": null,
      "status": 0,
    },
  },
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": undefined,
      "reason": null,
      "status": 1,
    },
  },
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    await delay(300);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "Patrick",
    ],
    "value": Object {
      "data": undefined,
      "reason": null,
      "status": 1,
    },
  },
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": undefined,
      "reason": null,
      "status": 1,
    },
  },
]
`);
    expect(onCacheChange).toHaveBeenCalledTimes(3);

    await delay(300);
    expect(memoized.cache).toMatchInlineSnapshot(`
Cache {
  "head": CacheItem {
    "key": Array [
      "Patrick",
    ],
    "value": Object {
      "data": undefined,
      "promise": Promise {},
      "reason": null,
      "status": 1,
    },
  },
  "size": 2,
  "tail": CacheItem {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": undefined,
      "promise": Promise {},
      "reason": null,
      "status": 1,
    },
  },
}
`);
    expect(onCacheChange).toHaveBeenCalledTimes(4);
});

it('should not fail to expire if the key does not exist', async () => {
    const onCacheChange = jest.fn();
    const memoized = memoize({fn: () => delay(200), onCacheChange, maxAge: 500});

    memoized(['SpongeBob']);
    expect(onCacheChange).toHaveBeenCalledTimes(0);
    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": undefined,
      "reason": null,
      "status": 1,
    },
  },
]
`);

    const itemToRemove = memoized.cache.tail;
    memoized.cache.remove(itemToRemove);
    itemToRemove!.destroy();
    expect(memoized.cache).toMatchInlineSnapshot(`
Cache {
  "head": null,
  "size": 0,
  "tail": null,
}
`);

    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    expect(memoized.cache).toMatchInlineSnapshot(`
Cache {
  "head": null,
  "size": 0,
  "tail": null,
}
`);
});

it('should refresh when called with `forceRefresh`', async () => {
    const onCacheChange = jest.fn();
    const memoized = memoize({fn: () => delay(200, {value: 'SquarePants'}), onCacheChange});

    memoized(['SpongeBob']);
    expect(onCacheChange).toHaveBeenCalledTimes(0);
    await delay(300);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": "SquarePants",
      "reason": null,
      "status": 1,
    },
  },
]
`);

    memoized(['SpongeBob'], true);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": "SquarePants",
      "reason": null,
      "status": 0,
    },
  },
]
`);

    await delay(300);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": "SquarePants",
      "reason": null,
      "status": 1,
    },
  },
]
`);
});

it('should throttle refreshing', async () => {
    const memoized = memoize({
        fn: () => delay(200, {value: 'SquarePants'}),
    });

    memoized(['SpongeBob']);
    await delay(300);
    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": "SquarePants",
      "reason": null,
      "status": 1,
    },
  },
]
`);

    const item1 = memoized(['SpongeBob'], true);
    const item2 = memoized(['SpongeBob'], true);

    expect(item1).toBe(item2);
    expect(item1.promise).toBe(item2.promise);

    expect(toSerializableArray(memoized.cache)).toMatchInlineSnapshot(`
Array [
  Object {
    "key": Array [
      "SpongeBob",
    ],
    "value": Object {
      "data": "SquarePants",
      "reason": null,
      "status": 0,
    },
  },
]
`);
});
