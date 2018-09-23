import delay from 'delay';
import memoize from '../src/memoize';

it('should memoize promises', async () => {
    const memoized = memoize(name => delay(200, {value: `Hello ${name}!`}), {maxSize: 2});

    expect(memoized('world')).toMatchSnapshot();

    await delay(300);
    expect(memoized('world')).toMatchSnapshot();
    expect(memoized('world')).toMatchSnapshot();
    expect(memoized('SpongeBob')).toMatchSnapshot();

    await delay(300);
    expect(memoized('SpongeBob')).toMatchSnapshot();
    expect(memoized('world')).toMatchSnapshot();
});

it('should not throw on rejected promises', async () => {
    const memoized = memoize(name => delay.reject(200, {value: new Error(`Hello ${name}!`)}), {maxSize: 2});

    expect(memoized('world')).toMatchSnapshot();

    await delay(300);
    expect(memoized('world')).toMatchSnapshot();
    expect(memoized('world')).toMatchSnapshot();
    expect(memoized('SpongeBob')).toMatchSnapshot();

    await delay(300);
    expect(memoized('SpongeBob')).toMatchSnapshot();
});

it('should export the internal cache', async () => {
    const memoized = memoize(name => delay(200, {value: `Hello ${name}!`}));

    expect(memoized.cache).toMatchSnapshot();
    expect(memoized.cache.size).toBe(0);

    memoized('world');
    expect(memoized.cache).toMatchSnapshot();

    await delay(300);
    expect(memoized.cache).toMatchSnapshot();
    expect(memoized.cache.size).toBe(1);
});

it('should default `maxSize` to 1', async () => {
    const memoized = memoize((name1, name2) =>
        delay(200, {
            value: `Hello ${name1}${name2 ? `and ${name2}` : ''}!`,
        })
    );

    memoized('SpongeBob');
    await delay(300);
    expect(memoized.cache.keys).toEqual([['SpongeBob']]);

    memoized('SpongeBob', 'Patrick');
    await delay(300);
    expect(memoized.cache.keys).toEqual([['SpongeBob', 'Patrick']]);
});

it('should properly match equal keys', async () => {
    const memoized = memoize(() => delay(200));

    memoized(NaN, NaN);
    memoized(NaN, NaN);
});

it('should have a `maxAge` option', async () => {
    const onCacheChange = jest.fn();
    const onExpire = jest.fn();
    const memoized = memoize(() => delay(200), {maxSize: 2, onCacheChange, maxAge: 500, onExpire});

    memoized('SpongeBob');
    expect(memoized.cache.keys).toEqual([['SpongeBob']]);
    expect(memoized.cache).toMatchSnapshot();
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    await delay(300);
    expect(memoized.cache).toMatchSnapshot();
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    memoized('Patrick');
    expect(memoized.cache.keys).toEqual([['Patrick'], ['SpongeBob']]);
    expect(memoized.cache).toMatchSnapshot();
    expect(onCacheChange).toHaveBeenCalledTimes(3);

    await delay(300);
    expect(memoized.cache.keys).toEqual([['Patrick']]);
    expect(memoized.cache).toMatchSnapshot();
    expect(onCacheChange).toHaveBeenCalledTimes(5);

    await delay(300);
    expect(memoized.cache.keys).toEqual([]);
    expect(memoized.cache).toMatchSnapshot();
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
    expect(memoized.cache.keys).toEqual([['SpongeBob']]);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    await delay(300);
    expect(memoized.cache.keys).toEqual([['SpongeBob']]);
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
    expect(memoized.cache.keys).toEqual([['SpongeBob']]);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    await delay(300);
    expect(memoized.cache.keys).toEqual([['SpongeBob']]);
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
    expect(memoized.cache.keys).toEqual([['SpongeBob']]);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    memoized.cache.keys.pop();
    memoized.cache.values.pop();
    expect(memoized.cache.keys).toEqual([]);

    await delay(300);
    expect(memoized.cache.keys).toEqual([]);
    expect(onCacheChange).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(1);
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
