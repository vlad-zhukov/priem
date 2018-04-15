import React from 'react';
import delay from 'delay';
import {mount} from 'enzyme';
import {createSerializer} from 'enzyme-to-json';
import {Priem, createStore} from '../src/index';
import {testComponent, testComponentNested} from '../__test-helpers__/util';

expect.addSnapshotSerializer(createSerializer({mode: 'deep'}));

it('should render a simple component', async () => {
    const {element, setStateSpy} = testComponent();
    const wrapper = mount(element);
    const instance = wrapper.instance();

    expect(instance).toHaveProperty('_isPriemComponent', true);
    expect(instance).toHaveProperty('_isMounted', true);

    await delay(150);
    wrapper.update();

    expect(wrapper.html()).toBe('<div>foo</div>');
    expect(setStateSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    instance._onUpdate();
    expect(instance).toHaveProperty('_isMounted', false);
    expect(setStateSpy).toHaveBeenCalledTimes(2);
});

it('should use `render`, `component` and `children` props', () => {
    const {Container} = createStore();

    const container = new Container({value: 'foo'});

    const renderSpy = jest.fn(p => <div>{p.container.value}</div>);
    const componentSpy = jest.fn(p => <div>{p.container.value}</div>);
    const childrenSpy = jest.fn(p => <div>{p.container.value}</div>);

    const element = (
        <Priem sources={{container}} render={renderSpy} component={componentSpy}>
            {React.createElement(childrenSpy)}
        </Priem>
    );

    const wrapper = mount(element);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(componentSpy).toHaveBeenCalledTimes(0);
    expect(childrenSpy).toHaveBeenCalledTimes(0);
    expect(wrapper.html()).toBe('<div>foo</div>');

    wrapper.setProps({render: undefined});

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(componentSpy).toHaveBeenCalledTimes(1);
    expect(childrenSpy).toHaveBeenCalledTimes(0);
    expect(wrapper.html()).toBe('<div>foo</div>');

    wrapper.setProps({component: undefined});

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(componentSpy).toHaveBeenCalledTimes(1);
    expect(childrenSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.html()).toBe('<div>foo</div>');
});

it('should resubscribe when `sources` change', () => {
    const {Container} = createStore();

    const container1 = new Container();
    const subscribeSpy1 = jest.spyOn(container1, '_subscribe');
    const unsubscribeSpy1 = jest.spyOn(container1, '_unsubscribe');

    const container2 = new Container();
    const subscribeSpy2 = jest.spyOn(container2, '_subscribe');
    const unsubscribeSpy2 = jest.spyOn(container2, '_unsubscribe');

    const wrapper = mount(<Priem sources={{container1}} render={() => null} />);

    expect(subscribeSpy1).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy1).toHaveBeenCalledTimes(0);
    expect(subscribeSpy2).toHaveBeenCalledTimes(0);
    expect(unsubscribeSpy2).toHaveBeenCalledTimes(0);

    wrapper.setProps({sources: {container2}});

    expect(subscribeSpy1).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy1).toHaveBeenCalledTimes(1);
    expect(subscribeSpy2).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy2).toHaveBeenCalledTimes(0);
});

it('should rerender when container state changes', () => {
    const {Container} = createStore();
    const container = new Container({value: 1});
    const wrapper = mount(<Priem sources={{}} render={() => null} />);
    const onUpdateSpy = jest.spyOn(wrapper.instance(), '_onUpdate');

    wrapper.setProps({sources: {container}});
    expect(onUpdateSpy).toHaveBeenCalledTimes(0);

    container.setState({value: 2});
    expect(onUpdateSpy).toHaveBeenCalledTimes(1);
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

it('should have a `refresh` method', async () => {
    const {element, container} = testComponent();
    const wrapper = mount(element);
    const instance = wrapper.instance();

    await delay(150);
    wrapper.update();
    expect(container.state).toMatchSnapshot(); // fulfilled

    instance.refresh();
    expect(container.state).toMatchSnapshot(); // refreshing

    await delay(150);
    wrapper.update();
    expect(container.state).toMatchSnapshot(); // fulfilled
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
