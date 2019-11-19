/* tslint:disable no-string-literal */

import delay from 'delay';
import {hydrateStore, Resource, toSerializableArray} from '../Resource';
import {shallowEqual} from '../utils';

it('should memoize promises', async () => {
    const resource = new Resource(({name}) => delay(200, {value: `Hello ${name}!`}), {maxSize: 2});

    expect(resource.read({name: 'world'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": undefined,
          "status": 0,
        }
    `);

    await delay(300);
    expect(resource.read({name: 'world'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": "Hello world!",
          "reason": undefined,
          "status": 1,
        }
    `);
    expect(resource.read({name: 'world'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": "Hello world!",
          "reason": undefined,
          "status": 1,
        }
    `);
    expect(resource.read({name: 'SpongeBob'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": undefined,
          "status": 0,
        }
    `);

    await delay(300);
    expect(resource.read({name: 'SpongeBob'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": "Hello SpongeBob!",
          "reason": undefined,
          "status": 1,
        }
    `);
    expect(resource.read({name: 'world'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": "Hello world!",
          "reason": undefined,
          "status": 1,
        }
    `);
});

it('should not throw on rejected promises', async () => {
    const resource = new Resource(({name}) => delay.reject(200, {value: new Error(`Hello ${name}!`)}), {maxSize: 2});

    expect(resource.read({name: 'world'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": undefined,
          "status": 0,
        }
    `);

    await delay(300);
    expect(resource.read({name: 'world'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": [Error: Hello world!],
          "status": 2,
        }
    `);
    expect(resource.read({name: 'world'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": [Error: Hello world!],
          "status": 2,
        }
    `);
    expect(resource.read({name: 'SpongeBob'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": undefined,
          "status": 0,
        }
    `);

    await delay(300);
    expect(resource.read({name: 'SpongeBob'}, {})).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": [Error: Hello SpongeBob!],
          "status": 2,
        }
    `);
});

it('should default `maxSize` to 1', async () => {
    const resource = new Resource<string, {name1: string; name2?: string}>(
        ({name1, name2}) =>
            delay(200, {
                value: `Hello ${name1}${name2 ? ` and ${name2}` : ''}!`,
            }),
        {},
    );

    resource.read({name1: 'SpongeBob'}, {});
    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name1": "SpongeBob",
            },
            "value": Object {
              "data": "Hello SpongeBob!",
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);

    resource.read({name1: 'SpongeBob', name2: 'Patrick'}, {});
    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name1": "SpongeBob",
              "name2": "Patrick",
            },
            "value": Object {
              "data": "Hello SpongeBob and Patrick!",
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);
});

it('should properly match equal keys', () => {
    const resource = new Resource(() => delay(200), {});

    resource.read({a: NaN, b: NaN}, {});
    resource.read({a: NaN, b: NaN}, {});

    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "a": NaN,
              "b": NaN,
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 0,
            },
          },
        ]
    `);
});

it('should have a `maxAge` option', async () => {
    const resource = new Resource(() => delay(200), {maxSize: 2});
    const onCacheChange = jest.spyOn(resource, 'onCacheChange');

    resource.read({name: 'SpongeBob'}, {maxAge: 500});
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 0,
            },
          },
        ]
    `);
    expect(onCacheChange).toHaveBeenCalledTimes(0);

    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    resource.read({name: 'Patrick'}, {maxAge: 500});
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "Patrick",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 0,
            },
          },
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "Patrick",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "Patrick",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);
    expect(onCacheChange).toHaveBeenCalledTimes(2);
});

it('should not fail to expire if the key does not exist', async () => {
    const resource = new Resource(() => delay(200), {});
    const onCacheChange = jest.spyOn(resource, 'onCacheChange');

    resource.read({name: 'SpongeBob'}, {maxAge: 500});
    expect(onCacheChange).toHaveBeenCalledTimes(0);
    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);

    const itemToRemove = resource['cache'].tail;
    if (itemToRemove) {
        resource['cache'].remove(itemToRemove);
        itemToRemove.destroy();
    }
    expect(resource['cache']).toMatchInlineSnapshot(`
        Cache {
          "head": undefined,
          "size": 0,
          "tail": undefined,
        }
    `);

    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    expect(resource['cache']).toMatchInlineSnapshot(`
        Cache {
          "head": undefined,
          "size": 0,
          "tail": undefined,
        }
    `);
});

it('should invalidate', async () => {
    const resource = new Resource<string, {name: string}>(() => delay(200, {value: 'SquarePants'}), {});
    const onCacheChange = jest.spyOn(resource, 'onCacheChange');

    resource.read({name: 'SpongeBob'}, {});
    expect(onCacheChange).toHaveBeenCalledTimes(0);

    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": "SquarePants",
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);

    resource.invalidate({name: 'SpongeBob'});
    expect(onCacheChange).toHaveBeenCalledTimes(2);

    resource.read({name: 'SpongeBob'}, {});
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 0,
            },
          },
        ]
    `);

    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(3);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Object {
              "name": "SpongeBob",
            },
            "value": Object {
              "data": "SquarePants",
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);

    resource.invalidate({name: 'does not exist'});
    expect(onCacheChange).toHaveBeenCalledTimes(3);
});

it('should guard if promise resolves after item was removed', async () => {
    let shouldReject = false;
    const resource = new Resource(
        ({value}) => {
            if (!shouldReject) {
                shouldReject = true;
                return delay(200, {value});
            }
            return delay.reject(10, {value: new Error('error!')});
        },
        {
            maxSize: 10,
        },
    );

    const item1 = resource.read({foo: 'bar'}, {});
    expect(item1).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": undefined,
          "status": 0,
        }
    `);
    resource.delete({foo: 'bar'});
    await delay(200);
    expect(item1).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": undefined,
          "status": 0,
        }
    `);

    const item2 = resource.read({foo: 'bar'}, {});
    resource.delete({foo: 'bar'});
    await delay(200);
    expect(item2).toMatchInlineSnapshot(`
        Object {
          "data": undefined,
          "reason": undefined,
          "status": 0,
        }
    `);
});

it('should properly set expiration timeout after hydration', async () => {
    hydrateStore([
        [
            'unique-key',
            [
                {
                    key: {
                        value: 'foo',
                    },
                    value: {
                        data: 'foo',
                        reason: undefined,
                        status: 1,
                    },
                },
            ],
        ],
    ]);

    const resource = new Resource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key',
    });

    const args = {value: 'foo'};
    const value = resource.read(args, {maxAge: 200});
    expect(value).toMatchInlineSnapshot(`
        Object {
          "data": "foo",
          "reason": undefined,
          "status": 1,
        }
    `);

    const item = resource.cache.findBy(cacheItem => shallowEqual(cacheItem.key, args))!;
    expect(typeof item.expireTimerId).toBe('number');

    delete item.key;
    await delay(200);

    // Hooray, it didn't throw!
});
