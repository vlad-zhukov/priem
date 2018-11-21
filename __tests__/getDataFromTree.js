/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import delay from 'delay';
import usePriem from '../src/usePriem';
import {Container, flushStore, populateStore} from '../src/Container';
import getDataFromTree from '../src/getDataFromTree';

afterEach(() => {
    flushStore();
});

it('should fetch and render to string with data', async () => {
    const ctr = new Container({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key-1',
    });

    function Comp() {
        const res = usePriem(ctr, ['foo']);
        return <div>{res.data}</div>;
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
    const ctr1 = new Container({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key-1',
    });
    const ctr2 = new Container({
        promise: (ctr1Value, value) => delay(100, {value: ctr1Value + value}),
        ssrKey: 'unique-key-2',
    });

    function Comp() {
        const res1 = usePriem(ctr1, ['foo']);
        const res2 = usePriem(ctr2, !res1.data ? null : [res1.data, 'bar']);
        return <div>{res2.data}</div>;
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

it('should not fetch data from containers without `ssrKey`', async () => {
    const ctr1 = new Container({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key-1',
    });
    const ctr2 = new Container({
        promise: (ctr1Value, value) => delay(100, {value: ctr1Value + value}),
    });

    function Comp() {
        const res1 = usePriem(ctr1, ['foo']);
        const res2 = usePriem(ctr2, !res1.data ? null : [res1.data, 'bar']);
        return <div>{res2.data}</div>;
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
    const ctr1 = new Container({
        promise: () => delay.reject(100, {value: new Error('Boom!')}),
        ssrKey: 'unique-key-1',
    });

    const ctr2 = new Container({
        promise: () => delay(10000, {value: 'A very long delay...'}),
        ssrKey: 'unique-key-2',
    });

    ctr1._get([]);

    await delay(300);

    function Comp() {
        usePriem(ctr1);
        usePriem(ctr2);
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

        const ctr1 = new Container({
            promise: value => delay(100, {value}),
            ssrKey: 'unique-key-1',
        });
        const ctr2 = new Container({
            promise: (ctr1Value, value) => delay(100, {value: ctr1Value + value}),
            ssrKey: 'unique-key-2',
        });

        return function Comp() {
            const res1 = usePriem(ctr1, ['foo']);
            const res2 = usePriem(ctr2, !res1.data ? null : [res1.data, 'bar']);
            return <div>{res2.data}</div>;
        };
    }

    const ServerComp = createComponent();
    await getDataFromTree(<ServerComp />);
    const initialStore = flushStore();

    const ClientComp = createComponent(initialStore);
    const content = ReactDOM.renderToStaticMarkup(<ClientComp />);

    expect(content).toBe('<div>foobar</div>');
});
