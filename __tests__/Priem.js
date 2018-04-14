import delay from 'delay';
import {mount} from 'enzyme';
import {createSerializer} from 'enzyme-to-json';
import {testComponent, testComponentNested} from '../__test-helpers__/util';

expect.addSnapshotSerializer(createSerializer({mode: 'deep'}));

it('should render a simple component', async () => {
    const {element} = testComponent();
    const wrapper = mount(element);
    await delay(150);
    wrapper.update();

    expect(wrapper).toMatchSnapshot();
});

it('should not keep data after the unmount if "persist: false"', async () => {
    const {element, container} = testComponent({options: {persist: false}});
    const wrapper = mount(element);
    await delay(150);
    wrapper.update();

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.memoized.keys()).toEqual([['foo']]);

    wrapper.unmount();

    expect(container.state).toMatchSnapshot(); // empty
    expect(container._cache.memoized.keys()).toEqual([]);

    wrapper.mount();
    await delay(150);
    wrapper.update();

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.memoized.keys()).toEqual([['foo']]);
});

it('should render a nested component', async () => {
    const {element, getStore} = testComponentNested({
        syncContainerProps: {ssrKey: 'unique-key-1'},
        container1Props: {ssrKey: 'unique-key-2'},
        container2Props: {ssrKey: 'unique-key-3'},
    });
    const wrapper = mount(element);
    await delay(300);
    wrapper.update();

    expect(wrapper).toMatchSnapshot();
    expect(getStore()).toMatchSnapshot();

    wrapper.find('button').simulate('click');
    wrapper.update();

    expect(wrapper).toMatchSnapshot();
    expect(getStore()).toMatchSnapshot();
});
