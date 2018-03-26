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
                autoRefresh: true,
            },
        },
    },
};

export const TestComponentNested = ({initialStore}) => (
    <PriemProvider initialStore={initialStore}>
        <Priem
            name="Test1"
            initialValues={{counter: 2}}
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

                const onClick = () => props.setPriem(s => ({counter: s.counter + 1}));

                return (
                    <Priem
                        name={`Test${props.priem.counter}`}
                        asyncValues={() => ({
                            testValue: {
                                args: ['bar'],
                                promise: value => delay(100, props.priem.testValue.value + value),
                            },
                        })}
                        render={({priem}) => (
                            <div>
                                {priem.testValue.value} <button onClick={onClick} />
                            </div>
                        )}
                    />
                );
            }}
        />
    </PriemProvider>
);

export const TestComponentNestedDecorated = ({initialStore}) => {
    @withPriem({
        name: 'Test1',
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
