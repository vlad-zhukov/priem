import React from 'react';
import delay from 'delay';
import {mount} from 'enzyme';
import {createSerializer} from 'enzyme-to-json';
import {testComponentDecorated, testComponentNestedDecorated} from '../__test-helpers__/util';

expect.addSnapshotSerializer(createSerializer({mode: 'deep'}));

it('should render a simple decorated component', async () => {
    const {element} = testComponentDecorated();
    const wrapper = mount(element);
    await delay(150);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it('should render a nested decorated component', async () => {
    const {element} = testComponentNestedDecorated();
    const wrapper = mount(element);
    await delay(300);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});
