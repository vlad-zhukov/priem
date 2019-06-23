/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {Cache, CacheItem, reduce} from '../Cache';

function toArray<K, V>(cache: Cache<K, V>): CacheItem<K, V>[] {
    return reduce<CacheItem<K, V>[], K, V>(cache, [], (acc, item) => {
        acc.push(item);
        return acc;
    });
}

function createCache(size: number = 5): Cache<string, number> {
    const items = [
        new CacheItem('foo', 123),
        new CacheItem('bar', 234),
        new CacheItem('baz', 345),
        new CacheItem('qux', 456),
        new CacheItem('quux', 567),
    ];
    return new Cache(items.slice(0, size));
}

it('should construct with items', () => {
    const cache = createCache(2);
    expect(cache).toMatchInlineSnapshot(`
                Cache {
                  "head": CacheItem {
                    "key": "foo",
                    "value": 123,
                  },
                  "size": 2,
                  "tail": CacheItem {
                    "key": "bar",
                    "value": 234,
                  },
                }
        `);
    expect(toArray(cache)).toMatchInlineSnapshot(`
                Array [
                  CacheItem {
                    "key": "foo",
                    "value": 123,
                  },
                  CacheItem {
                    "key": "bar",
                    "value": 234,
                  },
                ]
        `);
});

it('should prepend items', () => {
    const cache = createCache(0);
    expect(cache).toMatchInlineSnapshot(`
        Cache {
          "size": 0,
        }
    `);

    cache.prepend(new CacheItem('foo', 123));
    expect(toArray(cache)).toMatchInlineSnapshot(`
                Array [
                  CacheItem {
                    "key": "foo",
                    "value": 123,
                  },
                ]
        `);

    cache.prepend(new CacheItem('bar', 234));
    expect(toArray(cache)).toMatchInlineSnapshot(`
                Array [
                  CacheItem {
                    "key": "bar",
                    "value": 234,
                  },
                  CacheItem {
                    "key": "foo",
                    "value": 123,
                  },
                ]
        `);
});

it('should find am item by predicate', () => {
    const cache = createCache(2);
    expect(toArray(cache)).toMatchInlineSnapshot(`
                Array [
                  CacheItem {
                    "key": "foo",
                    "value": 123,
                  },
                  CacheItem {
                    "key": "bar",
                    "value": 234,
                  },
                ]
        `);

    const fn1 = jest.fn(item => item.key === 'foo');
    const res1 = cache.findBy(fn1);
    expect(res1).toMatchInlineSnapshot(`
                CacheItem {
                  "key": "foo",
                  "value": 123,
                }
        `);
    expect(fn1).toHaveBeenCalledTimes(1);

    const fn2 = jest.fn(item => item.key === 'baz');
    const res2 = cache.findBy(fn2);
    expect(res2).toBeUndefined();
    expect(fn2).toHaveBeenCalledTimes(2);

    expect(toArray(cache)).toMatchInlineSnapshot(`
                Array [
                  CacheItem {
                    "key": "foo",
                    "value": 123,
                  },
                  CacheItem {
                    "key": "bar",
                    "value": 234,
                  },
                ]
        `);
});

it('should remove an item by reference', () => {
    const cache = createCache(3);

    const res1 = cache.findBy(item => item.key === 'foo');
    res1!.lastRefreshAt = Date.now();
    expect(res1).toMatchInlineSnapshot(`
                CacheItem {
                  "key": "foo",
                  "value": 123,
                }
        `);

    const res2 = cache.findBy(item => item.key === 'baz');
    res2!.lastRefreshAt = Date.now();
    expect(res2).toMatchInlineSnapshot(`
                CacheItem {
                  "key": "baz",
                  "value": 345,
                }
        `);

    cache.remove(res1!);
    cache.remove(res2!);

    expect(toArray(cache)).toMatchInlineSnapshot(`
                Array [
                  CacheItem {
                    "key": "bar",
                    "value": 234,
                  },
                ]
        `);
});

it('should not remove an item if `item.lastRefreshAt` is `undefined`', () => {
    const cache = createCache(3);

    const item = cache.head;
    item!.lastRefreshAt = undefined;

    cache.remove(item!);

    expect(toArray(cache)).toMatchInlineSnapshot(`
                Array [
                  CacheItem {
                    "key": "foo",
                    "value": 123,
                  },
                  CacheItem {
                    "key": "bar",
                    "value": 234,
                  },
                  CacheItem {
                    "key": "baz",
                    "value": 345,
                  },
                ]
        `);
});
