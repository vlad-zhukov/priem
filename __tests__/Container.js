import delay from 'delay';
import {AsyncContainer, getContainerMap, injectStateMap} from '../src/Container';
import * as promiseState from '../src/promiseState';
import {removeObjectProps} from '../__test-helpers__/util';

function setup({props = {}, getAsyncValue, options}) {
    const container = new AsyncContainer(getAsyncValue, options);

    const updateSpy = jest.spyOn(container, 'update');
    const runAsyncSpy = jest.spyOn(container, 'runAsync');
    const subscribeSpy = jest.fn(() => {});
    container.subscribe(subscribeSpy);

    function runAsync(runAsyncOptions) {
        return container.runAsync({props, ...runAsyncOptions});
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

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue});

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
    expect([container.state, container._meta]).toMatchSnapshot();
});

it('should run promises if `autoRefresh` is false but `isForced` is true', async () => {
    const getAsyncValue = () => ({
        args: ['foo'],
        promise: value => delay(200, {value}),
        autoRefresh: false,
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue});

    runAsync({isForced: true});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
    expect([container.state, container._meta]).toMatchSnapshot();
});

it('should not run promises when awaiting', async () => {
    const getAsyncValue = () => ({
        args: ['foo'],
        promise: value => delay(200, {value}),
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue});

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(runAsyncSpy).toHaveBeenCalledTimes(3);
    expect([container.state, container._meta]).toMatchSnapshot();
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

    const {container, updateSpy, runAsync} = setup({getAsyncValue});

    await runAsync({isForced: false});
    expect([container.state, container._meta]).toMatchSnapshot();

    runAsync({isForced: true});
    expect([container.state, container._meta]).toMatchSnapshot();
    await delay(250);

    expect([container.state, container._meta]).toMatchSnapshot();

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

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue});

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);
    expect([container.state, container._meta]).toMatchSnapshot();
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

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue});

    runAsync({isForced: true});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    runAsync({isForced: true});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(4);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);
    expect([container.state, container._meta]).toMatchSnapshot();
});

it('should not try to rerun fulfilled promises if `value` is null', async () => {
    const getAsyncValue = () => ({
        args: [null],
        promise: value => delay(100, value),
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue});

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([[null]]);

    await delay(150);
    expect(container._cache.awaiting).toMatchObject([]);

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(runAsyncSpy).toHaveBeenCalledTimes(2);
    expect([container.state, container._meta]).toMatchSnapshot();
});

it('should expire if maxAge is set', async () => {
    const getAsyncValue = () => ({
        args: ['foo'],
        promise: value => delay(200, {value}),
        maxAge: 300,
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue});

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect([container.state, container._meta]).toMatchSnapshot(); // fulfilled

    await delay(100);
    expect([container.state, container._meta]).toMatchSnapshot(); // refreshing

    await delay(650);
    expect([container.state, container._meta]).toMatchSnapshot(); // refreshing
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    expect(updateSpy).toHaveBeenCalledTimes(7);
    expect(runAsyncSpy).toHaveBeenCalledTimes(4);
});

it('should rehydrate ssr data', async () => {
    injectStateMap({
        'unique-key-1': {
            state: promiseState.fulfilled('foo'),
            meta: {ssr: true},
        },
    });

    const promiseFn = jest.fn(value => delay(200, {value}));

    const getAsyncValue = () => ({
        args: ['foo'],
        promise: promiseFn,
    });

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({getAsyncValue, options: {ssrKey: 'unique-key-1'}});

    await runAsync({isForced: false});

    expect([container.state, container._meta]).toMatchSnapshot();
    expect(await container._cache.memoized.get(['foo'])).toBe('foo');

    expect(promiseFn).toHaveBeenCalledTimes(0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
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

    const {container, updateSpy, runAsync} = setup({getAsyncValue});

    await runAsync({isForced: false});
    await runAsync({isForced: false});

    expect(await container._cache.memoized.keys()).toEqual([['foo1', 'bar1'], ['foo0', 'bar0']]);

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

    const {container, runAsync} = setup({getAsyncValue});

    await runAsync({isForced: false});
    expect([container.state, container._meta]).toMatchSnapshot(); // foo-false

    await runAsync({isForced: false});
    expect([container.state, container._meta]).toMatchSnapshot(); // foo-true

    await runAsync({isForced: false});
    expect([container.state, container._meta]).toMatchSnapshot(); // foo-false
});

it('should add a container instances to the `containerMap` if `ssrKey` exists', () => {
    removeObjectProps(getContainerMap());

    const getAsyncValue = () => ({
        args: [],
        promise: () => delay(100, 'foo'),
    });

    setup({getAsyncValue, options: {ssrKey: 'unique-key-1'}});
    setup({getAsyncValue, options: {ssrKey: 'unique-key-2'}});

    expect(getContainerMap()).toHaveProperty('unique-key-1');
    expect(getContainerMap()).toHaveProperty('unique-key-2');
});

it('should not add a container instances to the `containerMap` if `ssrKey` does not exists', () => {
    removeObjectProps(getContainerMap());

    const getAsyncValue = () => ({
        args: [],
        promise: () => delay(100, 'foo'),
    });

    setup({getAsyncValue});

    expect(getContainerMap()).toEqual({});
});

it('should throw a container instance with such `ssrKey` has been already added', () => {
    removeObjectProps(getContainerMap());

    const getAsyncValue = () => ({
        args: [],
        promise: () => delay(100, 'foo'),
    });

    setup({getAsyncValue, options: {ssrKey: 'unique-key-1'}});

    expect(() => setup({getAsyncValue, options: {ssrKey: 'unique-key-1'}})).toThrow();
});
