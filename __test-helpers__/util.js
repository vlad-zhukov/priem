/* eslint-disable import/no-extraneous-dependencies, react/no-multi-comp, react/prop-types */

import React from 'react';
import delay from 'delay';
import Priem from '../src/Priem';
import createStore from '../src/createStore';
import withPriem from '../src/withPriem';
import * as promiseState from '../src/promiseState';

export function testComponent({initialStore, options} = {}) {
    const {AsyncContainer, getStore} = createStore(initialStore);

    const container = new AsyncContainer(
        () => ({
            args: ['foo'],
            promise: value => delay(100, value),
        }),
        options
    );

    const element = <Priem sources={{container}} render={p => <div>{p.container.value}</div>} />;

    return {element, getStore};
}

export function testComponentDecorated({initialStore, options} = {}) {
    const {AsyncContainer, getStore} = createStore(initialStore);

    const container = new AsyncContainer(
        () => ({
            args: ['foo'],
            promise: value => delay(100, value),
        }),
        options
    );

    const ComponentDecorated = withPriem({sources: {container}})(p => <div>{p.container.value}</div>);

    return {element: <ComponentDecorated />, getStore};
}

export const optionsForTestComponent = {
    state: promiseState.fulfilled('baz'),
    meta: {
        ssr: true,
        autoRefresh: true,
    },
};

export function testComponentNested({initialStore, syncContainerProps, container1Props, container2Props} = {}) {
    const {Container, AsyncContainer, getStore} = createStore(initialStore);

    const syncContainer = new Container({counter: 2}, syncContainerProps);

    const container1 = new AsyncContainer(
        ({syncContainer: sC}) => ({
            args: [sC.counter, 'foo'],
            promise: (counter, value) => delay(100, `${counter}-${value}`),
        }),
        container1Props
    );

    const container2 = new AsyncContainer(
        ({container1value}) => ({
            args: [container1value, 'bar'],
            promise: (c1value, value) => delay(100, c1value + value),
        }),
        container2Props
    );

    const element = (
        <Priem
            sources={{syncContainer, container1}}
            render={({container1: c1}) => {
                if (!c1.value) {
                    return null;
                }

                const onClick = () => syncContainer.setState(s => ({counter: s.counter + 1}));

                return (
                    <Priem
                        sources={{container2}}
                        container1value={c1.value}
                        render={({container2: c2}) => {
                            if (!c2.value) {
                                return null;
                            }

                            return (
                                <div>
                                    {c2.value}
                                    <button onClick={onClick} />
                                </div>
                            );
                        }}
                    />
                );
            }}
        />
    );

    return {element, getStore};
}

export function testComponentNestedDecorated({initialStore} = {}) {
    const {AsyncContainer, getStore} = createStore(initialStore);

    const container1 = new AsyncContainer(() => ({
        args: ['foo'],
        promise: value => delay(100, value),
    }));

    const container2 = new AsyncContainer(({component1value}) => ({
        args: [component1value, 'bar'],
        promise: (c1value, value) => delay(100, c1value + value),
    }));

    @withPriem({sources: {container1}})
    class TestComponent1 extends React.Component {
        render() {
            const {container1: c1} = this.props;

            if (!c1.value) {
                return null;
            }

            return <TestComponent2 component1value={c1.value} />;
        }
    }

    @withPriem({sources: {container2}})
    class TestComponent2 extends React.Component {
        render() {
            const {container2: c2} = this.props;
            return <div>{c2.value}</div>;
        }
    }

    return {element: <TestComponent1 />, getStore};
}
