import React from 'react';
import delay from 'delay';
import {mount} from 'enzyme';
import {createSerializer} from 'enzyme-to-json';
import {TestComponentSimpleDecorated, TestComponentNestedDecorated} from '../__test-helpers__/util';

expect.addSnapshotSerializer(createSerializer({mode: 'deep'}));

it('should render simple decorated component', async () => {
    const wrapper = mount(<TestComponentSimpleDecorated />);
    await delay(150);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it('should render nested decorated component', async () => {
    const wrapper = mount(<TestComponentNestedDecorated />);
    await delay(300);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});
