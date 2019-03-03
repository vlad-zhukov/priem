/**
 * @jest-environment node
 */

import * as React from 'react';
// tslint:disable-next-line no-submodule-imports
import * as ReactDOM from 'react-dom/server';
import delay from 'delay';
import {createResource, flushStore, populateStore, __INTERNALS__} from '../index';
import createGetDataFromTree from '../index.server';

const getDataFromTree = createGetDataFromTree(__INTERNALS__.renderPromises);

afterEach(() => {
    flushStore();
});

it('should fetch and render to string with data', async () => {
    const useResource = createResource<string, [string]>(value => delay(100, {value}), {
        ssrKey: 'unique-key-1',
    });

    const Comp: React.FC = () => {
        const [data] = useResource(['foo']);
        return <div>{data}</div>;
    };

    await getDataFromTree(<Comp />);

    expect(flushStore()).toMatchInlineSnapshot(`
Array [
  Array [
    "unique-key-1",
    Array [
      Object {
        "key": Array [
          "foo",
        ],
        "value": Object {
          "data": "foo",
          "reason": null,
          "status": 1,
        },
      },
    ],
  ],
]
`);

    const content = ReactDOM.renderToStaticMarkup(<Comp />);
    expect(content).toBe('<div>foo</div>');
});

it('should fetch data from a nested component', async () => {
    const useResource1 = createResource<string, [string]>(value => delay(100, {value}), {
        ssrKey: 'unique-key-1',
    });
    const useResource2 = createResource<string, [string, string]>(
        (res1Value, value) => delay(100, {value: res1Value + value}),
        {
            ssrKey: 'unique-key-2',
        }
    );

    const Comp: React.FC = () => {
        const [data1] = useResource1(['foo']);
        const [data2] = useResource2(!data1 ? null : [data1, 'bar']);
        return <div>{data2}</div>;
    };

    await getDataFromTree(<Comp />);

    expect(flushStore()).toMatchInlineSnapshot(`
Array [
  Array [
    "unique-key-1",
    Array [
      Object {
        "key": Array [
          "foo",
        ],
        "value": Object {
          "data": "foo",
          "reason": null,
          "status": 1,
        },
      },
    ],
  ],
  Array [
    "unique-key-2",
    Array [
      Object {
        "key": Array [
          "foo",
          "bar",
        ],
        "value": Object {
          "data": "foobar",
          "reason": null,
          "status": 1,
        },
      },
    ],
  ],
]
`);

    const content = ReactDOM.renderToStaticMarkup(<Comp />);

    expect(content).toBe('<div>foobar</div>');
});

it('should not fetch data from resources without `ssrKey`', async () => {
    const useResource1 = createResource<string, [string]>(value => delay(100, {value}), {
        ssrKey: 'unique-key-1',
    });
    const useResource2 = createResource<string, string[]>((res1Value, value) => delay(100, {value: res1Value + value}));

    function Comp() {
        const [data1] = useResource1(['foo']);
        const [data2] = useResource2(!data1 ? null : [data1, 'bar']);
        return <div>{data2}</div>;
    }

    await getDataFromTree(<Comp />);

    expect(flushStore()).toMatchInlineSnapshot(`
Array [
  Array [
    "unique-key-1",
    Array [
      Object {
        "key": Array [
          "foo",
        ],
        "value": Object {
          "data": "foo",
          "reason": null,
          "status": 1,
        },
      },
    ],
  ],
]
`);

    const content = ReactDOM.renderToStaticMarkup(<Comp />);

    expect(content).toBe('<div></div>');
});

it('should not add non-fulfilled cache items to store', async () => {
    const useResource1 = createResource(() => delay.reject(100, {value: new Error('Boom!')}), {
        ssrKey: 'unique-key-1',
    });

    const useResource2 = createResource<string>(() => delay(10000, {value: 'A very long delay...'}), {
        ssrKey: 'unique-key-2',
    });

    await delay(300);

    const Comp = () => {
        useResource1([]);
        useResource2([]);
        return null;
    };

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
            populateStore(initialStore);
        }

        const useResource1 = createResource<string, [string]>(value => delay(100, {value}), {
            ssrKey: 'unique-key-1',
        });
        const useResource2 = createResource<string, string[]>(
            (res1Value, value) => delay(100, {value: res1Value + value}),
            {
                ssrKey: 'unique-key-2',
            }
        );

        return function Comp() {
            const [data1] = useResource1(['foo']);
            const [data2] = useResource2(!data1 ? null : [data1, 'bar']);
            return <div>{data2}</div>;
        };
    }

    const ServerComp = createComponent();
    await getDataFromTree(<ServerComp />);

    const ClientComp = createComponent(flushStore());
    const content = ReactDOM.renderToStaticMarkup(<ClientComp />);

    expect(content).toBe('<div>foobar</div>');
});
