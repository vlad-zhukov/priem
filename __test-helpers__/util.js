/* eslint-disable import/no-extraneous-dependencies, react/no-multi-comp, react/prop-types */

import React from 'react';
import delay from 'delay';
import {PriemProvider, Priem} from '../src/Priem';
import withPriem from '../src/withPriem';
import {consts} from '../src/store';
import * as promiseState from '../src/promiseState';

export const TestComponentSimple = ({initialStore}) => (
    <PriemProvider initialStore={initialStore}>
        <Priem
            name="Test"
            autoRefresh
            asyncValues={() => ({
                testValue: {
                    args: ['foo'],
                    promise: value => delay(100, value),
                },
            })}
            render={({priem}) => <div>{priem.testValue.value}</div>}
        />
    </PriemProvider>
);

export const TestComponentSimpleDecorated = ({initialStore}) => {
    const TestComponent = withPriem({
        name: 'Test',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: value => delay(100, value),
            },
        }),
    })(({priem}) => <div>{priem.testValue.value}</div>);

    return (
        <PriemProvider initialStore={initialStore}>
            <TestComponent />
        </PriemProvider>
    );
};

export const initialStoreTestComponentSimple = {
    state: {
        Test: {
            testValue: promiseState.fulfilled('baz'),
        },
    },
    meta: {
        Test: {
            [consts.NAME]: 'Test',
            [consts.INITIAL_VALUES]: {},
            [consts.PERSIST]: false,
            [consts.COUNT]: 0,
            testValue: {
                ssr: true,
            },
        },
    },
};

export const TestComponentNested = ({initialStore}) => (
    <PriemProvider initialStore={initialStore}>
        <Priem
            name="Test1"
            autoRefresh
            asyncValues={() => ({
                testValue: {
                    args: ['foo'],
                    promise: value => delay(100, value),
                },
            })}
            render={(props) => {
                if (!props.priem.testValue.value) {
                    return null;
                }

                return (
                    <Priem
                        name="Test2"
                        autoRefresh
                        asyncValues={() => ({
                            testValue: {
                                args: ['bar'],
                                promise: value => delay(100, props.priem.testValue.value + value),
                            },
                        })}
                        render={({priem}) => <div>{priem.testValue.value}</div>}
                    />
                );
            }}
        />
    </PriemProvider>
);

export const TestComponentNestedDecorated = ({initialStore}) => {
    @withPriem({
        name: 'Test1',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: value => delay(100, value),
            },
        }),
    })
    class TestComponent1 extends React.Component {
        render() {
            const {priem} = this.props;

            if (!priem.testValue.value) {
                return null;
            }

            return <TestComponent2 testValue1={priem.testValue.value} />;
        }
    }

    @withPriem({
        name: 'Test2',
        autoRefresh: true,
        asyncValues: ({testValue1}) => ({
            testValue: {
                args: ['bar'],
                promise: value => delay(100, testValue1 + value),
            },
        }),
    })
    class TestComponent2 extends React.Component {
        render() {
            const {priem} = this.props;

            return <div>{priem.testValue.value}</div>;
        }
    }

    return (
        <PriemProvider initialStore={initialStore}>
            <TestComponent1 />
        </PriemProvider>
    );
};
