/**
 * @jest-environment node
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import delay from 'delay';
import {Resource} from '../Resource';
import {createResource, flushStore, hydrateStore, getRunningPromises} from '../index';
import createGetDataFromTree from '../server';

const getDataFromTree = createGetDataFromTree(getRunningPromises);

afterEach(() => {
    flushStore();
});

it('should hydrate store', () => {
    hydrateStore([
        [
            'unique-key',
            [
                {
                    key: {
                        value: 'foo',
                    },
                    value: {
                        data: 'bar',
                        reason: undefined,
                        status: 1,
                    },
                },
            ],
        ],
    ]);

    const res = new Resource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key',
    });

    expect(res.get({value: 'foo'})).toMatchInlineSnapshot(`
        Object {
          "data": "bar",
          "reason": undefined,
          "status": 1,
        }
    `);
    expect(flushStore()).toMatchInlineSnapshot(`
        Array [
          Array [
            "unique-key",
            Array [
              Object {
                "key": Object {
                  "value": "foo",
                },
                "value": Object {
                  "data": "bar",
                  "reason": undefined,
                  "status": 1,
                },
              },
            ],
          ],
        ]
    `);
    expect(flushStore()).toEqual([]);
});

it('should always clear caches when flushing', () => {
    const res = new Resource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key',
    });

    res.get({value: 'foo'});

    expect(res.has({value: 'foo'})).toBe(true);

    flushStore();

    expect(res.has({value: 'foo'})).toBe(false);
});

it('should throw when there is a store entry with such `ssrKey` already exists', async () => {
    const res1 = new Resource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key',
    });
    const res2 = new Resource(value => delay(100, {value}), {
        ssrKey: 'unique-key',
    });

    res1.get({value: 'foo'});
    expect(res1.has({value: 'foo'})).toBe(true);
    await delay(150);

    res2.get({value: 'bar'});
    expect(res2.has({value: 'bar'})).toBe(true);

    expect(flushStore).toThrowErrorMatchingInlineSnapshot(
        `"usePriem: A resource with 'unique-key' \`ssrKey\` already exists. Please make sure \`ssrKey\`s are unique."`,
    );

    expect(res1.has({value: 'foo'})).toBe(false);
    expect(res2.has({value: 'bar'})).toBe(false);
});

it('should fetch and render to string with data', async () => {
    const useResource = createResource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key-1',
    });

    function Comp() {
        const [data] = useResource({value: 'foo'});
        return <div>{data}</div>;
    }

    await getDataFromTree(<Comp />);

    const content = ReactDOM.renderToStaticMarkup(<Comp />);
    expect(content).toBe('<div>foo</div>');
});

it('should fetch data from a nested component', async () => {
    const useResource1 = createResource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key-1',
    });
    const useResource2 = createResource<string, {res1Value: string; value: string}>(
        ({res1Value, value}) => delay(100, {value: res1Value + value}),
        {
            ssrKey: 'unique-key-2',
        },
    );

    function Comp() {
        const [data1] = useResource1({value: 'foo'});
        const [data2] = useResource2(!data1 ? null : {res1Value: data1, value: 'bar'});
        return <div>{data2}</div>;
    }

    await getDataFromTree(<Comp />);

    expect(flushStore()).toMatchInlineSnapshot(`
        Array [
          Array [
            "unique-key-1",
            Array [
              Object {
                "key": Object {
                  "value": "foo",
                },
                "value": Object {
                  "data": "foo",
                  "reason": undefined,
                  "status": 1,
                },
              },
            ],
          ],
          Array [
            "unique-key-2",
            Array [
              Object {
                "key": Object {
                  "res1Value": "foo",
                  "value": "bar",
                },
                "value": Object {
                  "data": "foobar",
                  "reason": undefined,
                  "status": 1,
                },
              },
            ],
          ],
        ]
    `);
});

it('should not fetch data from resources without `ssrKey`', async () => {
    const useResource1 = createResource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key-1',
    });
    const useResource2 = createResource<string, {res1Value: string; value: string}>(({res1Value, value}) =>
        delay(100, {value: res1Value + value}),
    );

    function Comp() {
        const [data1] = useResource1({value: 'foo'});
        const [data2] = useResource2(!data1 ? null : {res1Value: data1, value: 'bar'});
        return <div>{data2}</div>;
    }

    await getDataFromTree(<Comp />);

    expect(flushStore()).toMatchInlineSnapshot(`
        Array [
          Array [
            "unique-key-1",
            Array [
              Object {
                "key": Object {
                  "value": "foo",
                },
                "value": Object {
                  "data": "foo",
                  "reason": undefined,
                  "status": 1,
                },
              },
            ],
          ],
        ]
    `);
});

it('should not add non-fulfilled cache items to store', async () => {
    const useResource1 = createResource(() => delay.reject(100, {value: new Error('Boom!')}), {
        ssrKey: 'unique-key-1',
    });

    const useResource2 = createResource(() => delay(1000, {value: 'A very long delay...'}), {
        ssrKey: 'unique-key-2',
    });

    await delay(300);

    function Comp() {
        useResource1({});
        useResource2({});
        return null;
    }

    ReactDOM.renderToStaticMarkup(<Comp />);

    expect(flushStore()).toMatchInlineSnapshot(`
        Array [
          Array [
            "unique-key-1",
            Array [],
          ],
          Array [
            "unique-key-2",
            Array [],
          ],
        ]
    `);
});

it('should rehydrate data from initial store', async () => {
    function createComponent(initialStore?: any) {
        if (initialStore) {
            hydrateStore(initialStore);
        }

        const useResource1 = createResource<string, {value: string}>(({value}) => delay(100, {value}), {
            ssrKey: 'unique-key-1',
        });
        const useResource2 = createResource<string, {res1Value: string; value: string}>(
            ({res1Value, value}) => delay(100, {value: res1Value + value}),
            {
                ssrKey: 'unique-key-2',
            },
        );

        return function Comp() {
            const [data1] = useResource1({value: 'foo'});
            const [data2] = useResource2(!data1 ? null : {res1Value: data1, value: 'bar'});
            return <div>{data2}</div>;
        };
    }

    const ServerComp = createComponent();
    await getDataFromTree(<ServerComp />);

    const ClientComp = createComponent(flushStore());
    const content = ReactDOM.renderToStaticMarkup(<ClientComp />);

    expect(content).toBe('<div>foobar</div>');
});
