import {Cache, CacheItem} from '../src/Cache';

const createCache = (size = 5) => {
    const items = [
        new CacheItem('foo', 123),
        new CacheItem('bar', 234),
        new CacheItem('baz', 345),
        new CacheItem('qux', 456),
        new CacheItem('quux', 567),
    ];
    return new Cache(items.slice(0, size));
};

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
    expect(cache.toArray()).toMatchInlineSnapshot(`
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
  "head": null,
  "size": 0,
  "tail": null,
}
`);

    cache.prepend(new CacheItem('foo', 123));
    expect(cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
    "key": "foo",
    "value": 123,
  },
]
`);

    cache.prepend(new CacheItem('bar', 234));
    expect(cache.toArray()).toMatchInlineSnapshot(`
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
    expect(cache.toArray()).toMatchInlineSnapshot(`
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
    expect(res2).toBeNull();
    expect(fn2).toHaveBeenCalledTimes(2);

    expect(cache.toArray()).toMatchInlineSnapshot(`
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
    expect(res1).toMatchInlineSnapshot(`
CacheItem {
  "key": "foo",
  "value": 123,
}
`);

    const res2 = cache.findBy(item => item.key === 'baz');
    expect(res2).toMatchInlineSnapshot(`
CacheItem {
  "key": "baz",
  "value": 345,
}
`);

    cache.remove(res1);
    cache.remove(res2);

    expect(cache.toArray()).toMatchInlineSnapshot(`
Array [
  CacheItem {
    "key": "bar",
    "value": 234,
  },
]
`);
});

it('should not remove an item if it is `null` or `item.used` is true', () => {
    const cache = createCache(3);

    cache.remove(null);

    const item = new CacheItem('foo', 123);

    cache.remove(item);
});
