/* eslint-disable react/no-multi-comp */

import React from 'react';
import delay from 'delay';
import {cleanup, fireEvent} from 'react-testing-library';
import Priem from '../src/Priem';
import createStore from '../src/createStore';
import render from '../__test-helpers__/render';
import {testComponent, testComponentNested, ErrorBoundary} from '../__test-helpers__/util';

afterEach(cleanup);

it('should render a simple component', async () => {
    const {element, setStateSpy} = testComponent();
    const {container, instance} = render(element);

    expect(instance).toHaveProperty('_isPriemComponent', true);
    expect(instance).toHaveProperty('_isMounted', true);

    await delay(150);

    expect(container.innerHTML).toBe('<div>foo</div>');
    expect(setStateSpy).toHaveBeenCalledTimes(2);

    cleanup();
    instance._onUpdate();
    expect(instance).toHaveProperty('_isMounted', false);
    expect(setStateSpy).toHaveBeenCalledTimes(2);
});

it('should use `children` and `component` props', () => {
    const {Container} = createStore();

    const ctr = new Container({value: 'foo'});

    const childrenSpy = jest.fn(p => <div>children {p.container.value}</div>);
    const componentSpy = jest.fn(p => <div>component {p.container.value}</div>);

    const createElement = (props = {}) => (
        <Priem sources={{container: ctr}} component={componentSpy} {...props}>
            {childrenSpy}
        </Priem>
    );
    const {container, rerender} = render(createElement());

    expect(childrenSpy).toHaveBeenCalledTimes(0);
    expect(componentSpy).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe('<div>component foo</div>');

    rerender(createElement({component: undefined}));

    expect(childrenSpy).toHaveBeenCalledTimes(1);
    expect(componentSpy).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe('<div>children foo</div>');
});

it('should throw if neither `children` nor `component` have been passed', async () => {
    const {Container} = createStore();

    const container = new Container({value: 'foo'});

    const {instance} = render(
        <ErrorBoundary>
            <Priem sources={{container}} />
        </ErrorBoundary>
    );

    expect(instance.state.hasError).toMatchSnapshot();
});

it('should throw if `sources` is not an object', async () => {
    const {instance} = render(
        <ErrorBoundary>
            <Priem>{() => null}</Priem>
        </ErrorBoundary>
    );

    expect(instance.state.hasError).toMatchSnapshot();
});

it('should resubscribe when `sources` change', () => {
    const {Container} = createStore();

    const container1 = new Container();
    const subscribeSpy1 = jest.spyOn(container1, '_subscribe');
    const unsubscribeSpy1 = jest.spyOn(container1, '_unsubscribe');

    const container2 = new Container();
    const subscribeSpy2 = jest.spyOn(container2, '_subscribe');
    const unsubscribeSpy2 = jest.spyOn(container2, '_unsubscribe');

    const createElement = (props = {}) => (
        <Priem sources={{container1}} {...props}>
            {() => null}
        </Priem>
    );
    const {rerender} = render(createElement());

    expect(subscribeSpy1).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy1).toHaveBeenCalledTimes(0);
    expect(subscribeSpy2).toHaveBeenCalledTimes(0);
    expect(unsubscribeSpy2).toHaveBeenCalledTimes(0);

    rerender(createElement({sources: {container2}}));

    expect(subscribeSpy1).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy1).toHaveBeenCalledTimes(1);
    expect(subscribeSpy2).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy2).toHaveBeenCalledTimes(0);
});

it('should rerender when container state changes', () => {
    const {Container} = createStore();

    const container = new Container({value: 1});
    const createElement = (props = {}) => (
        <Priem sources={{}} {...props}>
            {() => null}
        </Priem>
    );
    const {instance, rerender} = render(createElement());
    const onUpdateSpy = jest.spyOn(instance, '_onUpdate');

    rerender(createElement({sources: {container}}));
    expect(onUpdateSpy).toHaveBeenCalledTimes(0);

    container.setState({value: 2});
    expect(onUpdateSpy).toHaveBeenCalledTimes(1);
});

it('should not keep data after the unmount if `persist: false`', async () => {
    const {element, container} = testComponent({options: {persist: false}});
    const {rerender} = render(element);
    await delay(150);

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.memoized.keys()).toEqual([['foo']]);

    cleanup();

    expect(container.state).toMatchSnapshot(); // empty
    expect(container._cache.memoized.keys()).toEqual([]);

    rerender(element);
    await delay(150);

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.memoized.keys()).toEqual([['foo']]);
});

it('should have a `refresh` method', async () => {
    const {element, container} = testComponent();
    const {instance} = render(element);

    await delay(150);
    expect(container.state).toMatchSnapshot(); // fulfilled

    instance.refresh();
    expect(container.state).toMatchSnapshot(); // refreshing

    await delay(150);
    expect(container.state).toMatchSnapshot(); // fulfilled
});

it('should rerun promises when cache expires if `maxAge` is set', async () => {
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
        promise: value => delay(200, {value}),
        maxAge: 1000,
    };

    const {element, container, updateSpy, runAsyncSpy, setStateSpy} = testComponent({options});
    const {rerender} = render(element);

    expect(container.state).toMatchSnapshot(); // pending
    expect(container._cache.awaiting).toMatchObject([['foo1']]);
    expect(setStateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);

    await delay(250);

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.awaiting).toMatchObject([]);
    expect(setStateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(runAsyncSpy).toHaveBeenCalledTimes(3);

    rerender(React.cloneElement(element, {count: 2}));

    expect(container.state).toMatchSnapshot(); // refreshing
    expect(container._cache.awaiting).toMatchObject([['foo2']]);
    expect(setStateSpy).toHaveBeenCalledTimes(3);
    expect(updateSpy).toHaveBeenCalledTimes(4);
    expect(runAsyncSpy).toHaveBeenCalledTimes(5);

    await delay(210);

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.awaiting).toMatchObject([]);
    expect(setStateSpy).toHaveBeenCalledTimes(4);
    expect(updateSpy).toHaveBeenCalledTimes(6);
    expect(runAsyncSpy).toHaveBeenCalledTimes(6);

    await delay(800);

    expect(container.state).toMatchSnapshot(); // refreshing
    expect(container._cache.awaiting).toMatchObject([['foo2']]);
    expect(setStateSpy).toHaveBeenCalledTimes(5);
    expect(updateSpy).toHaveBeenCalledTimes(7);
    expect(runAsyncSpy).toHaveBeenCalledTimes(8);

    await delay(210);

    expect(container.state).toMatchSnapshot(); // fulfilled
    expect(container._cache.awaiting).toMatchObject([]);
    expect(setStateSpy).toHaveBeenCalledTimes(6);
    expect(updateSpy).toHaveBeenCalledTimes(9);
    expect(runAsyncSpy).toHaveBeenCalledTimes(9);
});

it('should pass a `refresh` method as a render prop', async () => {
    const {AsyncContainer} = createStore();

    let shouldReject = false;
    const ctr = new AsyncContainer({
        mapPropsToArgs: () => [`foo`],
        promise: value => {
            if (shouldReject) {
                return delay.reject(100, {value: new Error('error!')});
            }
            shouldReject = true;
            return delay(100, {value});
        },
    });

    const element = (
        <Priem sources={{container: ctr}}>
            {p => {
                expect(typeof p.refresh).toBe('function');
                return <button type="button" onClick={p.refresh} />;
            }}
        </Priem>
    );

    const {container} = render(element);

    expect(ctr.state).toMatchSnapshot(); // pending

    await delay(200);
    expect(ctr.state).toMatchSnapshot(); // fulfilled

    fireEvent.click(container.querySelector('button'));
    expect(ctr.state).toMatchSnapshot(); // refreshing

    await delay(200);
    expect(ctr.state).toMatchSnapshot(); // rejected
});

it('should pass a `refresh` method as a property into every AsyncContainer render prop', async () => {
    const {Container, AsyncContainer} = createStore();

    let shouldReject = false;
    const container1 = new AsyncContainer({
        mapPropsToArgs: () => ['foo'],
        promise: value => {
            if (shouldReject) {
                return delay.reject(100, {value: new Error('error!')});
            }
            shouldReject = true;
            return delay(100, {value});
        },
    });

    const container2 = new AsyncContainer({
        mapPropsToArgs: () => ['bar'],
        promise: value => delay(100, {value}),
    });

    const syncContainer = new Container({value: 'baz'});

    const element = (
        <Priem sources={{container1, container2, syncContainer}}>
            {p => {
                expect(typeof p.container1.refresh).toBe('function');
                expect(typeof p.container2.refresh).toBe('function');
                expect(typeof p.syncContainer.refresh).toBe('undefined');
                return <button type="button" onClick={p.container2.refresh} />;
            }}
        </Priem>
    );

    const {container} = render(element);

    expect([container1.state, container2.state, syncContainer.state]).toMatchSnapshot();

    await delay(200);
    expect([container1.state, container2.state, syncContainer.state]).toMatchSnapshot(); // fulfilled

    fireEvent.click(container.querySelector('button'));
    expect([container1.state, container2.state, syncContainer.state]).toMatchSnapshot(); // refreshing

    await delay(200);
    expect([container1.state, container2.state, syncContainer.state]).toMatchSnapshot(); // not rejected
});

it('should render a nested component', async () => {
    const {element, getStore} = testComponentNested({
        syncContainerProps: {ssrKey: 'unique-key-1'},
        container1Props: {ssrKey: 'unique-key-2'},
        container2Props: {ssrKey: 'unique-key-3'},
    });
    const {container} = render(element);
    await delay(300);

    expect(container.innerHTML).toMatchSnapshot();
    expect(getStore()).toMatchSnapshot();

    fireEvent.click(container.querySelector('button'));

    expect(container.innerHTML).toMatchSnapshot();
    expect(getStore()).toMatchSnapshot();
});

it('should throw if `mapPropsToArgs` updates too often due to a race condition', async () => {
    const {AsyncContainer} = createStore();
    const container = new AsyncContainer({
        mapPropsToArgs: ({value}) => [value],
        promise: () => delay(100),
    });

    const {instance} = render(
        <ErrorBoundary>
            <Priem sources={{container}} value="foo">
                {() => null}
            </Priem>
            <Priem sources={{container}} value="bar">
                {() => null}
            </Priem>
        </ErrorBoundary>
    );
    await delay(500);

    const {catchTime, initTime, hasError} = instance.state;
    console.info(`Error has been caught in ${catchTime - initTime}ms`);
    expect(hasError).toMatchSnapshot();
});

it('should not throw if `mapPropsToArgs` updates too often but limited by `maxArgs`', async () => {
    const {AsyncContainer} = createStore();
    const container = new AsyncContainer({
        mapPropsToArgs: ({value}) => [null, value],
        promise: () => delay(100),
        maxArgs: 1,
    });

    const {instance} = render(
        <ErrorBoundary>
            <Priem sources={{container}} value="foo">
                {() => null}
            </Priem>
            <Priem sources={{container}} value="bar">
                {() => null}
            </Priem>
        </ErrorBoundary>
    );
    await delay(500);

    expect(instance.state.hasError).toBeNull();
});
