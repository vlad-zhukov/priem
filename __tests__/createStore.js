import delay from 'delay';
import {createStore, promiseState} from '../src/index';

function setup({props = {}, options, initialStore}) {
    const {Container, AsyncContainer, getStore} = createStore(initialStore);
    const container = new AsyncContainer(options);

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
        Container,
        AsyncContainer,
        getStore,
    };
}

it('should not run promises if both `autoRefresh` and `isForced` are false', async () => {
    const options = {
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(200, {value}),
        autoRefresh: false,
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options});

    runAsync({isForced: false});
    expect(container._cache.awaiting).toMatchObject([]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
    expect([container.state, container._meta]).toMatchSnapshot();
});

it('should run promises if `autoRefresh` is false but `isForced` is true', async () => {
    const options = {
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(200, {value}),
        autoRefresh: false,
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options});

    runAsync({isForced: true});
    expect(container._cache.awaiting).toMatchObject([['foo']]);

    await delay(250);
    expect(container._cache.awaiting).toMatchObject([]);

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
    expect([container.state, container._meta]).toMatchSnapshot();
});

it('should not run promises when awaiting', async () => {
    const options = {
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(200, {value}),
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options});

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
    const options = {
        mapPropsToArgs: () => ['foo'],
        promise(value) {
            counter += 1;
            return delay(200, value + counter);
        },
    };

    const {container, updateSpy, runAsync} = setup({options});

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
    const options = {
        mapPropsToArgs: () => ['foo'],
        promise(value) {
            if (!called) {
                called = true;
                return delay.reject(200, new Error('foo'));
            }
            return delay(200, {value});
        },
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options});

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
    const options = {
        mapPropsToArgs: () => ['foo'],
        promise(value) {
            if (!called) {
                called = true;
                return delay.reject(200, new Error('foo'));
            }
            return delay(200, {value});
        },
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options});

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
    const options = {
        mapPropsToArgs: () => [null],
        promise: value => delay(100, value),
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options});

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
    const options = {
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(200, {value}),
        maxAge: 300,
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options});

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
    const initialStore = {
        'unique-key-1': {
            state: promiseState.fulfilled('foo'),
            meta: {ssr: true},
        },
    };

    const promiseFn = jest.fn(value => delay(200, {value}));

    const options = {
        mapPropsToArgs: () => ['foo'],
        promise: promiseFn,
        ssrKey: 'unique-key-1',
    };

    const {container, updateSpy, runAsyncSpy, runAsync} = setup({options, initialStore});

    await runAsync({isForced: false});

    expect([container.state, container._meta]).toMatchSnapshot();
    expect(await container._cache.memoized.get(['foo'])).toBe('foo');

    expect(promiseFn).toHaveBeenCalledTimes(0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(runAsyncSpy).toHaveBeenCalledTimes(1);
});

it('should add values to cache when `args` change', async () => {
    let id = 0;
    const options = {
        mapPropsToArgs: () => [`foo${id}`, `bar${id}`],
        promise(foo, bar) {
            id += 1;
            return delay(200, {foo, bar});
        },
    };

    const {container, updateSpy, runAsync} = setup({options});

    await runAsync({isForced: false});
    await runAsync({isForced: false});

    expect(await container._cache.memoized.keys()).toEqual([['foo1', 'bar1'], ['foo0', 'bar0']]);

    expect(updateSpy).toHaveBeenCalledTimes(4);
});

it('should return cached values when `args` change', async () => {
    let check = false;
    const options = {
        mapPropsToArgs: () => [`foo-${check}`],
        promise(value) {
            check = !check;
            return delay(200, {value});
        },
    };

    const {container, runAsync} = setup({options});

    await runAsync({isForced: false});
    expect([container.state, container._meta]).toMatchSnapshot(); // foo-false

    await runAsync({isForced: false});
    expect([container.state, container._meta]).toMatchSnapshot(); // foo-true

    await runAsync({isForced: false});
    expect([container.state, container._meta]).toMatchSnapshot(); // foo-false
});

it('should add a container instances to the `containerMap` if `ssrKey` exists', () => {
    const options = {
        promise: () => delay(100, 'foo'),
        ssrKey: 'unique-key-1',
    };

    const {Container, getStore} = setup({options});
    new Container({}, {ssrKey: 'unique-key-2'}); // eslint-disable-line no-new

    expect(getStore()).toHaveProperty('unique-key-1');
    expect(getStore()).toHaveProperty('unique-key-2');
});

it('should not add a container instances to the `containerMap` if `ssrKey` does not exists', () => {
    const options = {
        promise: () => delay(100, 'foo'),
    };

    const {getStore} = setup({options});

    expect(getStore()).toEqual({});
});

it('should throw a container instance with such `ssrKey` has been already added', () => {
    const options = {
        promise: () => delay(100, 'foo'),
        ssrKey: 'unique-key-1',
    };

    const {Container} = setup({options});

    expect(() => new Container({}, {ssrKey: 'unique-key-1'})).toThrow();
});
