/* tslint:disable no-string-literal */

import delay from 'delay';
import {Resource, toSerializableArray} from '../Resource';

it('should memoize promises', async () => {
    const resource = new Resource(name => delay(200, {value: `Hello ${name}!`}), {maxSize: 2});

    expect(resource.run(['world'])).toMatchInlineSnapshot(`
                Object {
                  "data": null,
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 0,
                }
        `);

    await delay(300);
    expect(resource.run(['world'])).toMatchInlineSnapshot(`
                Object {
                  "data": "Hello world!",
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 1,
                }
        `);
    expect(resource.run(['world'])).toMatchInlineSnapshot(`
                Object {
                  "data": "Hello world!",
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 1,
                }
        `);
    expect(resource.run(['SpongeBob'])).toMatchInlineSnapshot(`
                Object {
                  "data": null,
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 0,
                }
        `);

    await delay(300);
    expect(resource.run(['SpongeBob'])).toMatchInlineSnapshot(`
                Object {
                  "data": "Hello SpongeBob!",
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 1,
                }
        `);
    expect(resource.run(['world'])).toMatchInlineSnapshot(`
                Object {
                  "data": "Hello world!",
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 1,
                }
        `);
});

it('should not throw on rejected promises', async () => {
    const resource = new Resource(name => delay.reject(200, {value: new Error(`Hello ${name}!`)}), {maxSize: 2});

    expect(resource.run(['world'])).toMatchInlineSnapshot(`
                Object {
                  "data": null,
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 0,
                }
        `);

    await delay(300);
    expect(resource.run(['world'])).toMatchInlineSnapshot(`
                Object {
                  "data": null,
                  "promise": Promise {},
                  "reason": [Error: Hello world!],
                  "status": 2,
                }
        `);
    expect(resource.run(['world'])).toMatchInlineSnapshot(`
                Object {
                  "data": null,
                  "promise": Promise {},
                  "reason": [Error: Hello world!],
                  "status": 2,
                }
        `);
    expect(resource.run(['SpongeBob'])).toMatchInlineSnapshot(`
                Object {
                  "data": null,
                  "promise": Promise {},
                  "reason": undefined,
                  "status": 0,
                }
        `);

    await delay(300);
    expect(resource.run(['SpongeBob'])).toMatchInlineSnapshot(`
                Object {
                  "data": null,
                  "promise": Promise {},
                  "reason": [Error: Hello SpongeBob!],
                  "status": 2,
                }
        `);
});

it('should default `maxSize` to 1', async () => {
    const resource = new Resource<[string, string?], string>(
        (name1, name2) =>
            delay(200, {
                value: `Hello ${name1}${name2 ? ` and ${name2}` : ''}!`,
            }),
        {}
    );

    resource.run(['SpongeBob']);
    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": "Hello SpongeBob!",
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                ]
        `);

    resource.run(['SpongeBob', 'Patrick']);
    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                      "Patrick",
                    ],
                    "value": Object {
                      "data": "Hello SpongeBob and Patrick!",
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                ]
        `);
});

it('should properly match equal keys', async () => {
    const resource = new Resource<[any, any], void>(() => delay(200), {});

    resource.run([NaN, NaN]);
    resource.run([NaN, NaN]);

    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      NaN,
                      NaN,
                    ],
                    "value": Object {
                      "data": null,
                      "reason": undefined,
                      "status": 0,
                    },
                  },
                ]
        `);
});

it('should have a `maxAge` option', async () => {
    const resource = new Resource<[string], void>(() => delay(200), {
        maxSize: 2,
        maxAge: 500,
    });
    const onCacheChange = jest.spyOn(resource, 'onCacheChange');

    resource.run(['SpongeBob']);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": null,
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
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": undefined,
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                ]
        `);
    expect(onCacheChange).toHaveBeenCalledTimes(1);

    resource.run(['Patrick']);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "Patrick",
                    ],
                    "value": Object {
                      "data": null,
                      "reason": undefined,
                      "status": 0,
                    },
                  },
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
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
                    "key": Array [
                      "Patrick",
                    ],
                    "value": Object {
                      "data": undefined,
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": undefined,
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                ]
        `);
    expect(onCacheChange).toHaveBeenCalledTimes(3);

    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
        Array [
          Object {
            "key": Array [
              "Patrick",
            ],
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
          Object {
            "key": Array [
              "SpongeBob",
            ],
            "value": Object {
              "data": undefined,
              "reason": undefined,
              "status": 1,
            },
          },
        ]
    `);
    expect(onCacheChange).toHaveBeenCalledTimes(4);
});

it('should not fail to expire if the key does not exist', async () => {
    const resource = new Resource<[string], void>(() => delay(200), {maxAge: 500});
    const onCacheChange = jest.spyOn(resource, 'onCacheChange');

    resource.run(['SpongeBob']);
    expect(onCacheChange).toHaveBeenCalledTimes(0);
    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
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
                  "head": null,
                  "size": 0,
                  "tail": null,
                }
        `);

    await delay(300);
    expect(onCacheChange).toHaveBeenCalledTimes(1);
    expect(resource['cache']).toMatchInlineSnapshot(`
                Cache {
                  "head": null,
                  "size": 0,
                  "tail": null,
                }
        `);
});

it('should refresh when called with `forceRefresh`', async () => {
    const resource = new Resource<[string], string>(() => delay(200, {value: 'SquarePants'}), {});
    const onCacheChange = jest.spyOn(resource, 'onCacheChange');

    resource.run(['SpongeBob']);
    expect(onCacheChange).toHaveBeenCalledTimes(0);
    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": "SquarePants",
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                ]
        `);

    resource.run(['SpongeBob'], true);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": "SquarePants",
                      "reason": undefined,
                      "status": 0,
                    },
                  },
                ]
        `);

    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": "SquarePants",
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                ]
        `);
});

it('should throttle refreshing', async () => {
    const resource = new Resource<[string], string>(() => delay(200, {value: 'SquarePants'}), {});

    resource.run(['SpongeBob']);
    await delay(300);
    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": "SquarePants",
                      "reason": undefined,
                      "status": 1,
                    },
                  },
                ]
        `);

    const item1 = resource.run(['SpongeBob'], true);
    const item2 = resource.run(['SpongeBob'], true);

    expect(item1).toBe(item2);
    expect(item1.promise).toBe(item2.promise);

    expect(toSerializableArray(resource['cache'])).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "key": Array [
                      "SpongeBob",
                    ],
                    "value": Object {
                      "data": "SquarePants",
                      "reason": undefined,
                      "status": 0,
                    },
                  },
                ]
        `);
});
