import React from 'react';
import delay from 'delay';
import {mount} from 'enzyme';
import {createSerializer} from 'enzyme-to-json';
import {consts} from '../src/store';
import * as promiseState from '../src/promiseState';
import {TestComponentSimple, TestComponentNested} from '../__test-helpers__/util';

expect.addSnapshotSerializer(createSerializer({mode: 'deep'}));

it('should render simple component', async () => {
    const wrapper = mount(<TestComponentSimple />);
    await delay(150);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it('should render nested component', async () => {
    const wrapper = mount(<TestComponentNested />);
    await delay(300);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it('should rehydrate ssr data', async () => {
    const initialState = {
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
    const wrapper = mount(<TestComponentSimple initialState={initialState} />);
    await delay(150);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});
