import React from 'react';
import {shallow} from 'enzyme';
import delay from 'delay';
import {MemoizedPool} from '../src/MemoizedPool';

function setup(options) {
    class TestComponent extends React.Component {
        state = {};
        render() {
            return null;
        }
    }

    const component = shallow(<TestComponent />);
    const cache = new MemoizedPool();
    const onChange = jest.fn(updater => component.setState(updater));
    const onExpire = jest.fn(() => {
        // eslint-disable-next-line no-use-before-define
        runPromises();
    });
    function runPromises() {
        cache.runPromises({...options, onExpire, onChange});
    }

    return {
        component,
        cache,
        onChange,
        onExpire,
        runPromises,
    };
}

it('should not run promises if both `autoRefresh` and `isForced` are false', async () => {
    const props = {
        name: 'Test',
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: () => delay(200),
            },
        }),
        autoRefresh: false,
    };

    const {component, cache, onChange, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(cache.awaiting).toMatchObject({});

    await delay(250);
    expect(cache.awaiting).toMatchObject({});

    expect(onChange).toHaveBeenCalledTimes(0);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect(component.state()).toMatchSnapshot();
});

it('should run promises if `autoRefresh` is false but `isForced` is true', async () => {
    const props = {
        name: 'Test',
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: () => delay(200),
            },
        }),
        autoRefresh: false,
    };

    const {component, cache, onChange, onExpire, runPromises} = setup({props, isForced: true});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(cache.awaiting).toMatchObject({'testValue@Test': []});

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect(component.state()).toMatchSnapshot();
});

it('should not run promises when awaiting', async () => {
    const props = {
        name: 'Test',
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: () => delay(200),
            },
        }),
        autoRefresh: true,
    };

    const {component, cache, onChange, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(cache.awaiting).toMatchObject({'testValue@Test': []});

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect(component.state()).toMatchSnapshot();
});

it('should not rerun promises if previous promise was rejected', async () => {
    let called = false;
    const props = {
        name: 'Test',
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: () => {
                    if (!called) {
                        called = true;
                        return delay.reject(200, new Error('foo'));
                    }
                    return delay(200);
                },
            },
        }),
        autoRefresh: true,
    };

    const {component, cache, onChange, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(cache.awaiting).toMatchObject({'testValue@Test': []});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': []});

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect(component.state()).toMatchSnapshot();
});

it('should rerun promises if previous promise was rejected but `isForced` is true', async () => {
    let called = false;
    const props = {
        name: 'Test',
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: () => {
                    if (!called) {
                        called = true;
                        return delay.reject(200, new Error('foo'));
                    }
                    return delay(200);
                },
            },
        }),
        autoRefresh: true,
    };

    const {component, cache, onChange, onExpire, runPromises} = setup({props, isForced: true});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(cache.awaiting).toMatchObject({'testValue@Test': []});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(cache.awaiting).toMatchObject({'testValue@Test': []});

    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect(component.state()).toMatchSnapshot();
});

it('should expire if maxAge is set', async () => {
    const props = {
        name: 'Test',
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: () => delay(200),
                maxAge: 100,
            },
        }),
        autoRefresh: true,
    };

    const {component, cache, onChange, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(1000);
    expect(cache.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    expect(onChange).toHaveBeenCalledTimes(7);
    expect(onExpire).toHaveBeenCalledTimes(3);
    expect(component.state()).toMatchSnapshot();
});
