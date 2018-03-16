import React from 'react';
import delay from 'delay';
import {PriemProvider, Priem} from '../src/Priem';

export const TestComponentSimple = ({initialState}) => (
    <PriemProvider initialState={initialState}>
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

export const TestComponentNested = ({initialState}) => (
    <PriemProvider initialState={initialState}>
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
