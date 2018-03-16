import React from 'react';
import delay from 'delay';
import {MemoizedPool} from '../src/MemoizedPool';
import {FakeProviderStore} from '../src/store';
import * as promiseState from '../src/promiseState';

function setup(options) {
    const store = new FakeProviderStore();
    const pool = new MemoizedPool();

    store.initialize(options.props);

    const update = jest.fn(updater => store.update(options.props.name, updater));
    const onExpire = jest.fn(() => {
        // eslint-disable-next-line no-use-before-define
        runPromises();
    });

    function runPromises(moreOptions) {
        return pool.runPromises({...options, ...moreOptions, onExpire, update});
    }

    return {
        store,
        pool,
        update,
        onExpire,
        runPromises,
    };
}

it('should not run promises if both `autoRefresh` and `isForced` are false', async () => {
    const props = {
        name: 'Test',
        autoRefresh: false,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: value => delay(200, {value}),
            },
        }),
    };

    const {store, pool, update, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(pool.awaiting).toMatchObject({});

    await delay(250);
    expect(pool.awaiting).toMatchObject({});

    expect(update).toHaveBeenCalledTimes(0);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect([store.state, store.meta]).toMatchSnapshot();
});

it('should run promises if `autoRefresh` is false but `isForced` is true', async () => {
    const props = {
        name: 'Test',
        autoRefresh: false,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: value => delay(200, {value}),
            },
        }),
    };

    const {store, pool, update, onExpire, runPromises} = setup({props, isForced: true});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(pool.awaiting).toMatchObject({'testValue@Test': []});

    expect(update).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect([store.state, store.meta]).toMatchSnapshot();
});

it('should not run promises when awaiting', async () => {
    const props = {
        name: 'Test',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: value => delay(200, {value}),
            },
        }),
    };

    const {store, pool, update, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(pool.awaiting).toMatchObject({'testValue@Test': []});

    expect(update).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect([store.state, store.meta]).toMatchSnapshot();
});

it('should refresh promise if forced', async () => {
    const props = {
        name: 'Test',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: value => delay(200, {value}),
            },
        }),
    };

    const {store, update, runPromises} = setup({props, isForced: false});

    await runPromises();
    expect([store.state, store.meta]).toMatchSnapshot();

    runPromises({isForced: true});
    expect([store.state, store.meta]).toMatchSnapshot();
    await delay(250);

    expect(update).toHaveBeenCalledTimes(4);
});

it('should not rerun promises if previous promise was rejected', async () => {
    let called = false;
    const props = {
        name: 'Test',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise(value) {
                    if (!called) {
                        called = true;
                        return delay.reject(200, new Error('foo'));
                    }
                    return delay(200, {value});
                },
            },
        }),
    };

    const {store, pool, update, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(pool.awaiting).toMatchObject({'testValue@Test': []});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': []});

    expect(update).toHaveBeenCalledTimes(2);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect([store.state, store.meta]).toMatchSnapshot();
});

it('should rerun promises if previous promise was rejected but `isForced` is true', async () => {
    let called = false;
    const props = {
        name: 'Test',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise(value) {
                    if (!called) {
                        called = true;
                        return delay.reject(200, new Error('foo'));
                    }
                    return delay(200, {value});
                },
            },
        }),
    };

    const {store, pool, update, onExpire, runPromises} = setup({props, isForced: true});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(pool.awaiting).toMatchObject({'testValue@Test': []});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect(pool.awaiting).toMatchObject({'testValue@Test': []});

    expect(update).toHaveBeenCalledTimes(4);
    expect(onExpire).toHaveBeenCalledTimes(0);
    expect([store.state, store.meta]).toMatchSnapshot();
});

it('should expire if maxAge is set', async () => {
    const props = {
        name: 'Test',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: value => delay(200, {value}),
                maxAge: 300,
            },
        }),
    };

    const {store, pool, update, onExpire, runPromises} = setup({props, isForced: false});

    runPromises();
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    await delay(250);
    expect([store.state, store.meta]).toMatchSnapshot(); // fulfilled

    await delay(100);
    expect([store.state, store.meta]).toMatchSnapshot(); // refreshing

    await delay(650);
    expect([store.state, store.meta]).toMatchSnapshot(); // refreshing
    expect(pool.awaiting).toMatchObject({'testValue@Test': [['foo']]});

    expect(update).toHaveBeenCalledTimes(7);
    expect(onExpire).toHaveBeenCalledTimes(3);
});

it('should rehydrate ssr data', async () => {
    const promiseFn = jest.fn(value => delay(200, {value}));

    const props = {
        name: 'Test',
        autoRefresh: true,
        asyncValues: () => ({
            testValue: {
                args: ['foo'],
                promise: promiseFn,
            },
        }),
    };

    const {store, pool, update, onExpire, runPromises} = setup({props, isForced: false});

    await store.update('Test', {
        data: {testValue: promiseState.fulfilled('foo')},
        meta: {testValue: {ssr: true}},
    });

    await runPromises();

    expect([store.state, store.meta]).toMatchSnapshot();

    expect(await pool.memoized['testValue@Test'].get(['foo'])).toBe('foo');

    expect(promiseFn).toHaveBeenCalledTimes(0);
    expect(update).toHaveBeenCalledTimes(1);
    expect(onExpire).toHaveBeenCalledTimes(0);
});
