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

it('should rerun promises when cache expires if maxAge is set', async () => {
    /**
     * ASYNC UPDATE FLOW.
     * Numbers mean the order of function calls.
     *
     *                     | Priem#setState | AsyncC#_update | AsyncC#_runAsync
     * --------------------|----------------|----------------|------------------
     *  mount (pending)    | 3              | 2              | 1, 4
     *  fulfilled          | 6              | 5, 8           | 7
     *  setProps (pending) | 11             | 10             | 9, 12
     *  fulfilled          | 14             | 13, 16         | 15
     *  onExpire (pending) | 19             | 18             | 17, 20
     *  fulfilled          | 22             | 21, 24         | 23
     */

    const options = {
        mapPropsToArgs: ({count = 1}) => [`foo${count}`],
        promise: value => delay(200, value),
        maxAge: 300,
    };

    const {element, container, updateSpy, runAsyncSpy, setStateSpy} = testComponent({options});
    const wrapper = mount(element);

    expect(container.state).toMatchSnapshot(); // pending
    expect(container._cache.awaiting).toMatchObject([['foo1']]);
    expect(setStateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);

    await delay(200);
    wrapper.update();

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.awaiting).toMatchObject([]);
    expect(setStateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(runAsyncSpy).toHaveBeenCalledTimes(3);

    wrapper.setProps({count: 2});

    expect(container.state).toMatchSnapshot(); // refreshing
    expect(container._cache.awaiting).toMatchObject([['foo2']]);
    expect(setStateSpy).toHaveBeenCalledTimes(3);
    expect(updateSpy).toHaveBeenCalledTimes(4);
    expect(runAsyncSpy).toHaveBeenCalledTimes(5);

    await delay(210);
    wrapper.update();

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.awaiting).toMatchObject([]);
    expect(setStateSpy).toHaveBeenCalledTimes(4);
    expect(updateSpy).toHaveBeenCalledTimes(6);
    expect(runAsyncSpy).toHaveBeenCalledTimes(6);

    await delay(200);
    wrapper.update();

    expect(container.state).toMatchSnapshot(); // refreshing
    expect(container._cache.awaiting).toMatchObject([['foo2']]);
    expect(setStateSpy).toHaveBeenCalledTimes(5);
    expect(updateSpy).toHaveBeenCalledTimes(7);
    expect(runAsyncSpy).toHaveBeenCalledTimes(8);

    await delay(100);
    wrapper.update();

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.awaiting).toMatchObject([]);
    expect(setStateSpy).toHaveBeenCalledTimes(6);
    expect(updateSpy).toHaveBeenCalledTimes(9);
    expect(runAsyncSpy).toHaveBeenCalledTimes(9);
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

it('should throw if there is a race condition', async () => {
    const {AsyncContainer} = createStore();
    const container = new AsyncContainer({
        mapPropsToArgs: ({value}) => [value],
        promise: value => delay(100, value),
    });

    /* eslint-disable react/no-unused-state, react/prop-types */
    class ErrorBoundary extends React.Component {
        state = {initTime: Date.now(), hasError: null};

        componentDidCatch(error) {
            this.setState({hasError: error, catchTime: Date.now()});
        }

        render() {
            if (this.state.hasError) {
                return null;
            }
            return this.props.children;
        }
    }
    /* eslint-enable react/no-unused-state, react/prop-types */

    const wrapper = mount(
        <ErrorBoundary>
            <Priem sources={{container}} value="foo" />
            <Priem sources={{container}} value="bar" />
        </ErrorBoundary>
    );
    await delay(500);

    const state = wrapper.state();
    console.info(`Error has been caught in ${state.catchTime - state.initTime}ms`);
    expect(state.hasError).toMatchSnapshot();
});
