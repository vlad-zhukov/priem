/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import delay from 'delay';
import {testComponent, testComponentNested} from '../__test-helpers__/util';
import Priem from '../src/Priem';
import {Container, flushStore} from '../src/Container';
import getDataFromTree from '../src/getDataFromTree';

afterEach(() => {
    flushStore();
});

it('should fetch and render to string with data', async () => {
    const element = testComponent({options: {ssrKey: 'unique-key-1'}});
    await getDataFromTree(element);

    expect(flushStore()).toMatchInlineSnapshot(`
Object {
  "unique-key-1": Array [
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
}
`);

    const content = ReactDOM.renderToStaticMarkup(element);
    expect(content).toBe('<div>foo</div>');
});

it('should fetch data from a nested component', async () => {
    const element = testComponentNested({
        ctr1Props: {ssrKey: 'unique-key-1'},
        ctr2Props: {ssrKey: 'unique-key-2'},
    });
    await getDataFromTree(element);

    expect(flushStore()).toMatchInlineSnapshot(`
Object {
  "unique-key-1": Array [
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
  "unique-key-2": Array [
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
}
`);

    const content = ReactDOM.renderToStaticMarkup(element);

    expect(content).toBe('<div>foobar</div>');
});

it('should not fetch data from containers without `ssrKey`', async () => {
    const element = testComponentNested({
        ctr1Props: {ssrKey: 'unique-key-1'},
    });
    await getDataFromTree(element);

    expect(flushStore()).toMatchInlineSnapshot(`
Object {
  "unique-key-1": Array [
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
}
`);

    const content = ReactDOM.renderToStaticMarkup(element);

    expect(content).toBe('<div></div>');
});

it('should not add non-fulfilled cache items to store', async () => {
    const ctr1 = new Container({
        promise: () => delay.reject(100, {value: new Error('Boom!')}),
        ssrKey: 'ctr-1',
    });

    const ctr2 = new Container({
        promise: () => delay(10000, {value: 'A very long delay...'}),
        ssrKey: 'ctr-2',
    });

    ctr1._get({});

    await delay(300);

    ReactDOM.renderToString(<Priem sources={{ctr1, ctr2}}>{() => null}</Priem>);

    expect(flushStore()).toMatchInlineSnapshot(`
Object {
  "ctr-1": Array [],
  "ctr-2": Array [],
}
`);
});

it('should rehydrate data from initial store', async () => {
    const serverElement = testComponentNested({
        ctr1Props: {ssrKey: 'unique-key-1'},
        ctr2Props: {ssrKey: 'unique-key-2'},
    });
    await getDataFromTree(serverElement);
    const initialStore = flushStore();

    const clientElement = testComponentNested({
        initialStore,
        ctr1Props: {ssrKey: 'unique-key-1'},
        ctr2Props: {ssrKey: 'unique-key-2'},
    });
    const content = ReactDOM.renderToStaticMarkup(clientElement);

    expect(content).toBe('<div>foobar</div>');
});

it('should catch all errors and reject the promise', async () => {
    const MyComponent = () => {
        throw new Error('foo');
    };

    await expect(getDataFromTree(<MyComponent />)).rejects.toThrow('foo');

    const ctr1 = new Container({
        mapPropsToArgs: () => {
            throw new Error('bar');
        },
        promise: () => delay(100),
        ssrKey: 'ctr-1',
    });
    const element1 = <Priem sources={{ctr1}}>{() => null}</Priem>;
    await expect(getDataFromTree(element1)).rejects.toThrow('bar');

    const ctr2 = new Container({
        mapPropsToArgs: () => {
            throw new Error('baz');
        },
        promise: () => delay(100),
        ssrKey: 'ctr-2',
    });
    const element2 = <Priem sources={{ctr1, ctr2}}>{() => null}</Priem>;
    await expect(getDataFromTree(element2)).rejects.toThrow('bar');
});
