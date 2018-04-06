import React from 'react';
import delay from 'delay';
import {mount} from 'enzyme';
import {createSerializer} from 'enzyme-to-json';
import {TestComponentSimple, TestComponentNested, initialStoreTestComponentSimple} from '../__test-helpers__/util';

expect.addSnapshotSerializer(createSerializer({mode: 'deep'}));

function getStateFromSources(sources) {
    return Object.keys(sources).reduce((result, key) => {
        const source = sources[key];
        result[key] = {state: source.state, meta: source.meta};
        return result;
    }, {});
}

it('should render a simple component', async () => {
    const wrapper = mount(<TestComponentSimple />);
    await delay(150);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it('should rehydrate ssr data', async () => {
    const wrapper = mount(<TestComponentSimple initialState={initialStoreTestComponentSimple} />);
    await delay(150);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it('should render a nested component', async () => {
    const wrapper = mount(<TestComponentNested />);
    await delay(300);
    wrapper.update();

    expect(wrapper).toMatchSnapshot();
    expect(getStateFromSources(wrapper.children().instance()._sources)).toMatchSnapshot();

    wrapper.find('button').simulate('click');
    wrapper.update();

    expect(wrapper).toMatchSnapshot();
    expect(getStateFromSources(wrapper.children().instance()._sources)).toMatchSnapshot();
});
