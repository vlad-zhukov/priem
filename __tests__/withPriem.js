/* eslint-disable react/no-multi-comp */

import React from 'react';
import delay from 'delay';
import {cleanup} from 'react-testing-library';
import render from '../__test-helpers__/render';
import withPriem from '../src/withPriem';
import {Container, populateStore, flushStore} from '../src/Container';

afterEach(() => {
    flushStore();
    cleanup();
});

function testComponentDecorated({initialStore, options} = {}) {
    if (initialStore) {
        populateStore(initialStore);
    }

    const ctr = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
        ...options,
    });

    const ComponentDecorated = withPriem({sources: {ctr}})(p => <div>{p.ctr.value}</div>);

    return {element: <ComponentDecorated />};
}

function testComponentNestedDecorated({initialStore} = {}) {
    if (initialStore) {
        populateStore(initialStore);
    }

    const ctr1 = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
    });

    const ctr2 = new Container({
        mapPropsToArgs: ({ctr1Value}) => [ctr1Value, 'bar'],
        promise: (ctr1Value, value) => delay(100, {value: ctr1Value + value}),
    });

    @withPriem({sources: {ctr1}})
    class TestComponent1 extends React.Component {
        render() {
            if (!this.props.ctr1.value) {
                return null;
            }

            return <TestComponent2 ctr1Value={this.props.ctr1.value} />;
        }
    }

    @withPriem({sources: {ctr2}})
    class TestComponent2 extends React.Component {
        render() {
            return <div>{this.props.ctr2.value}</div>;
        }
    }

    return {element: <TestComponent1 />};
}

it('should render a simple decorated component', async () => {
    const {element} = testComponentDecorated();
    const {container} = render(element);
    await delay(150);
    expect(container.innerHTML).toBe('<div>foo</div>');
});

it('should render a nested decorated component', async () => {
    const {element} = testComponentNestedDecorated();
    const {container} = render(element);
    await delay(300);
    expect(container.innerHTML).toBe('<div>foobar</div>');
});

it("should throw if 'component' prop exists", () => {
    expect(() => withPriem({component: () => {}})).toThrow();
});

it("should throw if 'children' prop exists", () => {
    expect(() => withPriem({children: () => {}})).toThrow();
});
