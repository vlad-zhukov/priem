import delay from 'delay';
import {AsyncContainer} from '../src/Container';
import * as promiseState from '../src/promiseState';

function setup({props = {}, getAsyncValue, ...options}) {
    const container = new AsyncContainer(getAsyncValue);

    const updateSpy = jest.spyOn(container, 'update');
    const runAsyncSpy = jest.spyOn(container, 'runAsync');
    const subscribeSpy = jest.fn(() => {});
    container.subscribe(subscribeSpy);

    function runAsync(moreOptions) {
        return container.runAsync({props, ...options, ...moreOptions});
    }

    return {
        container,
        updateSpy,
        runAsyncSpy,
        subscribeSpy,
        runAsync,
    };
}

it('should not run promises if both `autoRefresh` and `isForced` are false', async () => {
    const getAsyncValue = () => ({
        args: ['foo'],
        promise: value => delay(200, {value}),
        autoRefresh: false,
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: false});

    runAsync();
    expect(container.cache.awaiting).toMatchObject([]);

    await delay(250);
    expect(container.cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
    expect([container.state, container.meta]).toMatchSnapshot();
});

it('should run promises if `autoRefresh` is false but `isForced` is true', async () => {
    const getAsyncValue = () => ({
        args: ['foo'],
        promise: value => delay(200, {value}),
        autoRefresh: false,
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: true});

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container.cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
    expect([container.state, container.meta]).toMatchSnapshot();
});

it('should not run promises when awaiting', async () => {
    const getAsyncValue = () => ({
        args: ['foo'],
        promise: value => delay(200, {value}),
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: false});

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container.cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(runAsyncSpy).toHaveBeenCalledTimes(3);
    expect([container.state, container.meta]).toMatchSnapshot();
});

it('should refresh a promise if forced', async () => {
    let counter = 0;
    const getAsyncValue = () => ({
        args: ['foo'],
        promise(value) {
            counter += 1;
            return delay(200, value + counter);
        },
    });

    const {container, updateSpy, runAsync} = setup({getAsyncValue, isForced: false});

    await runAsync();
    expect([container.state, container.meta]).toMatchSnapshot();

    runAsync({isForced: true});
    expect([container.state, container.meta]).toMatchSnapshot();
    await delay(250);

    expect([container.state, container.meta]).toMatchSnapshot();

    expect(updateSpy).toHaveBeenCalledTimes(4);
});

it('should not rerun promises if previous promise was rejected', async () => {
    let called = false;
    const getAsyncValue = () => ({
        args: ['foo'],
        promise(value) {
            if (!called) {
                called = true;
                return delay.reject(200, new Error('foo'));
            }
            return delay(200, {value});
        },
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: false});

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container.cache.awaiting).toMatchObject([]);

    runAsync();
    expect(container.cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);
    expect([container.state, container.meta]).toMatchSnapshot();
});

it('should rerun promises if previous promise was rejected but `isForced` is true', async () => {
    let called = false;
    const getAsyncValue = () => ({
        args: ['foo'],
        promise(value) {
            if (!called) {
                called = true;
                return delay.reject(200, new Error('foo'));
            }
            return delay(200, {value});
        },
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: true});

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container.cache.awaiting).toMatchObject([]);

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container.cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(4);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);
    expect([container.state, container.meta]).toMatchSnapshot();
});

it('should not try to rerun fulfilled promises if `value` is null', async () => {
    const getAsyncValue = () => ({
        args: [null],
        promise: value => delay(100, value),
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: false});

    runAsync();
    expect(container.cache.awaiting).toMatchObject([[null]]);

    await delay(150);
    expect(container.cache.awaiting).toMatchObject([]);

    runAsync();
    expect(container.cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);
    expect([container.state, container.meta]).toMatchSnapshot();
});

it('should expire if maxAge is set', async () => {
    const getAsyncValue = () => ({
        args: ['foo'],
        promise: value => delay(200, {value}),
        maxAge: 300,
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: false});

    runAsync();
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect([container.state, container.meta]).toMatchSnapshot(); // fulfilled

    await delay(100);
    expect([container.state, container.meta]).toMatchSnapshot(); // refreshing

    await delay(650);
    expect([container.state, container.meta]).toMatchSnapshot(); // refreshing
    expect(container.cache.awaiting).toMatchObject([['foo']]);

    expect(updateSpy).toHaveBeenCalledTimes(7);
    expect(runAsyncSpy).toHaveBeenCalledTimes(4);
});

it('should rehydrate ssr data', async () => {
    const promiseFn = jest.fn(value => delay(200, {value}));

    const getAsyncValue = () => ({
        args: ['foo'],
        promise: promiseFn,
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, isForced: false});

    container.update({
        data: promiseState.fulfilled('foo'),
        meta: {ssr: true},
    });

    await runAsync();

    expect([container.state, container.meta]).toMatchSnapshot();
    expect(await container.cache.memoized.get(['foo'])).toBe('foo');

    expect(promiseFn).toHaveBeenCalledTimes(0);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
});

it('should add values to cache when `args` change', async () => {
    let id = 0;
    const getAsyncValue = () => ({
        args: [`foo${id}`, `bar${id}`],
        promise(foo, bar) {
            id += 1;
            return delay(200, {foo, bar});
        },
    });

    const {container, updateSpy, runAsync} = setup({getAsyncValue, isForced: false});

    await runAsync();
    await runAsync();

    expect(await container.cache.memoized.keys()).toEqual([['foo1', 'bar1'], ['foo0', 'bar0']]);

    expect(updateSpy).toHaveBeenCalledTimes(4);
});

it('should return cached values when `args` change', async () => {
    let check = false;
    const getAsyncValue = () => ({
        args: [`foo-${check}`],
        promise(value) {
            check = !check;
            return delay(200, {value});
        },
    });

    const {container, runAsync} = setup({getAsyncValue, isForced: false});

    await runAsync();
    expect([container.state, container.meta]).toMatchSnapshot(); // foo-false

    await runAsync();
    expect([container.state, container.meta]).toMatchSnapshot(); // foo-true

    await runAsync();
    expect([container.state, container.meta]).toMatchSnapshot(); // foo-false
});
