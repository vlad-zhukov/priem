/* eslint-disable import/no-extraneous-dependencies, react/no-multi-comp */

import React from 'react';
import delay from 'delay';
import {cleanup, fireEvent} from 'react-testing-library';
import render from '../__test-helpers__/render';
import {testComponent, testComponentNested, ErrorBoundary} from '../__test-helpers__/util';
import Priem from '../src/Priem';
import {Container} from '../src/Container';

const setStateSpy = jest.spyOn(Priem.prototype, 'setState');
const updateSpy = jest.spyOn(Priem.prototype, '_update');
const getSpy = jest.spyOn(Container.prototype, '_get');
const onCacheChangeSpy = jest.spyOn(Container.prototype, '_onCacheChange');

afterEach(() => {
    setStateSpy.mockClear();
    updateSpy.mockClear();
    getSpy.mockClear();
    onCacheChangeSpy.mockClear();
    cleanup();
});

it('should render', async () => {
    const element = testComponent();
    const {container, instance} = render(element);

    expect(instance).toHaveProperty('_isPriemComponent', true);
    expect(instance).toHaveProperty('_isMounted', true);

    await delay(150);

    expect(container.innerHTML).toBe('<div>foo</div>');
    expect(setStateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    cleanup();
    instance._update();
    expect(instance).toHaveProperty('_isMounted', false);
    expect(setStateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(2); // Called it the second time manually above
});

it('should use `children` and `component` props', async () => {
    const ctr = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
    });

    const childrenSpy = jest.fn(p => <div>children {p.ctr.data}</div>);
    const componentSpy = jest.fn(p => <div>component {p.ctr.data}</div>);

    const createElement = (props = {}) => (
        <Priem sources={{ctr}} component={componentSpy} {...props}>
            {childrenSpy}
        </Priem>
    );
    const {container, rerender} = render(createElement());

    await delay(150);

    expect(childrenSpy).toHaveBeenCalledTimes(0);
    expect(componentSpy).toHaveBeenCalledTimes(2);
    expect(container.innerHTML).toBe('<div>component foo</div>');

    rerender(createElement({component: undefined}));

    await delay(150);

    expect(childrenSpy).toHaveBeenCalledTimes(1);
    expect(componentSpy).toHaveBeenCalledTimes(2);
    expect(container.innerHTML).toBe('<div>children foo</div>');
});

it('should throw if neither `children` nor `component` have been passed', async () => {
    const ctr = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
    });

    const {instance} = render(
        <ErrorBoundary>
            <Priem sources={{ctr}} />
        </ErrorBoundary>
    );

    expect(instance.state.hasError).toMatchInlineSnapshot(
        `[TypeError: Priem: <Priem />'s 'children' must be one of the following: 'function', but got: 'null'.]`
    );
});

it('should throw if `sources` is not an object', async () => {
    const {instance} = render(
        <ErrorBoundary>
            <Priem>{() => null}</Priem>
        </ErrorBoundary>
    );

    expect(instance.state.hasError).toMatchInlineSnapshot(
        `[TypeError: Priem: <Priem />'s 'sources' must be one of the following: 'object', but got: 'undefined'.]`
    );
});

it('should resubscribe when `sources` change', async () => {
    const ctr1 = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
    });
    const subscribeSpy1 = jest.spyOn(ctr1, '_subscribe');
    const unsubscribeSpy1 = jest.spyOn(ctr1, '_unsubscribe');

    const ctr2 = new Container({
        mapPropsToArgs: () => ['bar'],
        promise: value => delay(100, {value}),
    });
    const subscribeSpy2 = jest.spyOn(ctr2, '_subscribe');
    const unsubscribeSpy2 = jest.spyOn(ctr2, '_unsubscribe');

    const createElement = (props = {}) => (
        <Priem sources={{ctr1}} {...props}>
            {() => null}
        </Priem>
    );
    const {rerender} = render(createElement());

    await delay(200);

    expect(subscribeSpy1).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy1).toHaveBeenCalledTimes(0);
    expect(subscribeSpy2).toHaveBeenCalledTimes(0);
    expect(unsubscribeSpy2).toHaveBeenCalledTimes(0);

    rerender(createElement({sources: {ctr2}}));

    expect(subscribeSpy1).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy1).toHaveBeenCalledTimes(1);
    expect(subscribeSpy2).toHaveBeenCalledTimes(1);
    expect(unsubscribeSpy2).toHaveBeenCalledTimes(0);
});

it('should have a `refresh` method', async () => {
    const element = testComponent();
    const {container, instance} = render(element);

    await delay(200);
    expect(container.innerHTML).toBe('<div>foo</div>');
    expect(getSpy).toHaveBeenCalledTimes(2);

    instance.refresh();
    expect(container.innerHTML).toBe('<div>foo</div>');
    expect(getSpy).toHaveBeenCalledTimes(3);

    await delay(200);
    expect(container.innerHTML).toBe('<div>foo</div>');
    expect(getSpy).toHaveBeenCalledTimes(4);
});

it('should rerun promises when cache expires if `maxAge` is set', async () => {
    /**
     * ASYNC UPDATE FLOW.
     * Numbers mean the order of function calls.
     *
     *                     | Priem#setState | Priem#_update | Container#_onCacheChange | Container#_get
     * --------------------|----------------|---------------|--------------------------|------------------
     *  mount (pending)    |                |               |                          | 1
     *  fulfilled          | 4              | 3             | 2                        | 5
     *  setProps (pending) |                |               |                          | 6
     *  fulfilled          | 9              | 8             | 7                        | 10
     *  expire (pending)   | 13             | 12            | 11                       | 14
     *  fulfilled          | 17             | 16            | 15                       | 18
     */

    const options = {
        mapPropsToArgs: ({count = 1}) => [`foo${count}`],
        promise: value => delay(200, {value}),
        maxAge: 1000,
    };

    const element = testComponent({options});
    const {container, rerender} = render(element);

    // mount (pending)

    expect(container.innerHTML).toBe('<div></div>');
    expect(setStateSpy).toHaveBeenCalledTimes(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);

    await delay(250);

    // fulfilled

    expect(container.innerHTML).toBe('<div>foo1</div>');
    expect(setStateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(2);

    rerender(React.cloneElement(element, {count: 2}));

    // setProps (pending)

    expect(container.innerHTML).toBe('<div></div>');
    expect(setStateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(3);

    await delay(210);

    // fulfilled

    expect(container.innerHTML).toBe('<div>foo2</div>');
    expect(setStateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(4);

    await delay(800);

    // expire (pending)

    expect(container.innerHTML).toBe('<div>foo2</div>');
    expect(setStateSpy).toHaveBeenCalledTimes(3);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(3);
    expect(getSpy).toHaveBeenCalledTimes(5);

    await delay(210);

    // fulfilled

    expect(container.innerHTML).toBe('<div>foo2</div>');
    expect(setStateSpy).toHaveBeenCalledTimes(4);
    expect(updateSpy).toHaveBeenCalledTimes(4);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(4);
    expect(getSpy).toHaveBeenCalledTimes(6);
});

it('should pass a `refresh` method as a render prop', async () => {
    let shouldReject = false;
    const ctr = new Container({
        mapPropsToArgs: () => [`foo`],
        promise(value) {
            if (shouldReject) {
                return delay.reject(100, {value: new Error('error!')});
            }
            shouldReject = true;
            return delay(100, {value});
        },
    });

    const element = (
        <Priem sources={{ctr}}>
            {p => {
                expect(typeof p.refresh).toBe('function');
                return (
                    <button type="button" onClick={p.refresh}>
                        {p.ctr.data}
                    </button>
                );
            }}
        </Priem>
    );

    const {container} = render(element);

    expect(container.innerHTML).toBe('<button type="button"></button>');

    await delay(200);
    expect(container.innerHTML).toBe('<button type="button">foo</button>');

    fireEvent.click(container.querySelector('button'));
    expect(container.innerHTML).toBe('<button type="button">foo</button>');

    await delay(200);
    expect(container.innerHTML).toBe('<button type="button"></button>');
});

it('should render a nested component', async () => {
    const element = testComponentNested();
    const {container} = render(element);
    await delay(300);

    expect(container.innerHTML).toBe('<div>foobar</div>');
});

it('should render components that are subscribed to the same container but need different data', async () => {
    const ctr = new Container({
        mapPropsToArgs: ({value}) => [value],
        promise: value => delay(100, {value}),
        maxSize: 2,
    });

    const {container} = render(
        <div>
            <Priem sources={{ctr}} value="foo">
                {p => <div>{p.ctr.data}</div>}
            </Priem>
            <Priem sources={{ctr}} value="bar">
                {p => <div>{p.ctr.data}</div>}
            </Priem>
        </div>
    );
    await delay(300);

    expect(container.innerHTML).toBe('<div><div>foo</div><div>bar</div></div>');
});
