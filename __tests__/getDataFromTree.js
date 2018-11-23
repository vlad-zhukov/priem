/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import delay from 'delay';
import usePriem from '../src/usePriem';
import {Resource, flushStore, populateStore} from '../src/Resource';
import getDataFromTree from '../src/getDataFromTree';

afterEach(() => {
    flushStore();
});

it('should fetch and render to string with data', async () => {
    const res = new Resource({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key-1',
    });

    function Comp() {
        const {data} = usePriem(res, ['foo']);
        return <div>{data}</div>;
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
    expect(content).toBe('<div>foo</div>');
});

it('should fetch data from a nested component', async () => {
    const res1 = new Resource({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key-1',
    });
    const res2 = new Resource({
        promise: (res1Value, value) => delay(100, {value: res1Value + value}),
        ssrKey: 'unique-key-2',
    });

    function Comp() {
        const {data: data1} = usePriem(res1, ['foo']);
        const {data: data2} = usePriem(res2, !data1 ? null : [data1, 'bar']);
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
    const res1 = new Resource({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key-1',
    });
    const res2 = new Resource({
        promise: (res1Value, value) => delay(100, {value: res1Value + value}),
    });

    function Comp() {
        const {data: data1} = usePriem(res1, ['foo']);
        const {data: data2} = usePriem(res2, !data1 ? null : [data1, 'bar']);
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
    const res1 = new Resource({
        promise: () => delay.reject(100, {value: new Error('Boom!')}),
        ssrKey: 'unique-key-1',
    });

    const res2 = new Resource({
        promise: () => delay(10000, {value: 'A very long delay...'}),
        ssrKey: 'unique-key-2',
    });

    res1._get([]);

    await delay(300);

    function Comp() {
        usePriem(res1);
        usePriem(res2);
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
    function createComponent(initialStore) {
        if (initialStore) {
            populateStore(initialStore);
        }

        const res1 = new Resource({
            promise: value => delay(100, {value}),
            ssrKey: 'unique-key-1',
        });
        const res2 = new Resource({
            promise: (res1Value, value) => delay(100, {value: res1Value + value}),
            ssrKey: 'unique-key-2',
        });

        return function Comp() {
            const {data: data1} = usePriem(res1, ['foo']);
            const {data: data2} = usePriem(res2, !data1 ? null : [data1, 'bar']);
            return <div>{data2}</div>;
        };
    }

    const ServerComp = createComponent();
    await getDataFromTree(<ServerComp />);
    const initialStore = flushStore();

    const ClientComp = createComponent(initialStore);
    const content = ReactDOM.renderToStaticMarkup(<ClientComp />);

    expect(content).toBe('<div>foobar</div>');
});
