/* eslint-disable import/no-extraneous-dependencies, react/no-multi-comp, react/prop-types */

import React from 'react';
import delay from 'delay';
import Priem from '../src/Priem';
import {Container, AsyncContainer} from '../src/Container';
import withPriem from '../src/withPriem';
import * as promiseState from '../src/promiseState';

export function TestComponentSimple({options}) {
    const container = new AsyncContainer(
        () => ({
            args: ['foo'],
            promise: value => delay(100, value),
        }),
        options,
    );

    return <Priem sources={{container}} render={({container}) => <div>{container.value}</div>} />;
}

export function TestComponentSimpleDecorated({options}) {
    const container = new AsyncContainer(
        () => ({
            args: ['foo'],
            promise: value => delay(100, value),
        }),
        options
    );

    const TestComponent = withPriem({sources: {container}})(({container}) => <div>{container.value}</div>);

    return <TestComponent />;
}

export const initialStateForTestComponentSimple = {
    state: promiseState.fulfilled('baz'),
    meta: {
        ssr: true,
        autoRefresh: true,
    },
};

export function TestComponentNested({options}) {
    const syncContainer = new Container({counter: 2});

    const container1 = new AsyncContainer(({syncContainer}) => {
        return ({
            args: [syncContainer.counter, 'foo'],
            promise: (counter, value) => delay(100, `${counter}-${value}`),
        });
    });

    const container2 = new AsyncContainer(({container1value}) => ({
        args: [container1value, 'bar'],
        promise: (c1value, value) => delay(100, c1value + value),
    }));

    return (
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
                        render={({container2: c2}) => (
                            <div>
                                {c2.value}
                                <button onClick={onClick} />
                            </div>
                        )}
                    />
                );
            }}
        />
    );
}

export function TestComponentNestedDecorated({options}) {
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

    return <TestComponent1 />;
}
