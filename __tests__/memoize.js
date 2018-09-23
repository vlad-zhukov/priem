import delay from 'delay';
import memoize from '../src/memoize/memoize';

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

    expect(memoized('Spoungebob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);

    expect(memoized('Spoungebob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello Spoungebob!",
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

    expect(memoized('Spoungebob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(300);

    expect(memoized('Spoungebob')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello Spoungebob!],
  "status": 2,
  "value": null,
}
`);
});

it('should export the internal cache', async () => {
    const memoized = memoize(name => delay(200, {value: `Hello ${name}!`}));

    expect(memoized.cache).toMatchInlineSnapshot(`
Object {
  "keys": Array [],
  "size": 0,
  "values": Array [],
}
`);

    expect(memoized.cache.size).toBe(0);

    memoized('world');

    expect(memoized.cache).toMatchInlineSnapshot(`
Object {
  "keys": Array [
    Array [
      "world",
    ],
  ],
  "size": 1,
  "values": Array [
    Object {
      "promise": Promise {},
      "reason": null,
      "status": 0,
      "value": null,
    },
  ],
}
`);

    await delay(300);

    expect(memoized.cache).toMatchInlineSnapshot(`
Object {
  "keys": Array [
    Array [
      "world",
    ],
  ],
  "size": 1,
  "values": Array [
    Object {
      "promise": Promise {},
      "reason": null,
      "status": 1,
      "value": "Hello world!",
    },
  ],
}
`);

    expect(memoized.cache.size).toBe(1);
});

it('should default `maxSize` to 1', async () => {
    const memoized = memoize((name1, name2) =>
        delay(200, {
            value: `Hello ${name1}${name2 ? `and ${name2}` : ''}!`,
        })
    );

    memoized('Spoungebob');
    await delay(300);
    expect(memoized.cache.keys).toEqual([['Spoungebob']]);

    memoized('Spoungebob', 'Patrick');
    await delay(300);
    expect(memoized.cache.keys).toEqual([['Spoungebob', 'Patrick']]);
});

it('should properly match equal keys', async () => {
    const memoized = memoize(() => delay(200), {});

    memoized(NaN, NaN);
    memoized(NaN, NaN);
});

it('should export `isMemoized` and `options`', async () => {
    const memoized = memoize(() => delay(200));

    expect(memoized.isMemoized).toBe(true);
    expect(memoized.options).toMatchInlineSnapshot(`
Object {
  "isEqual": [Function],
  "maxSize": 1,
  "onCacheAdd": [Function],
  "onCacheChange": [Function],
  "onCacheHit": [Function],
}
`);
});
