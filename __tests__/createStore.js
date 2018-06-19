import delay from 'delay';
import createStore from '../src/createStore';
import * as promiseState from '../src/promiseState';

function setupStore({options, initialStore} = {}) {
    const {Container, AsyncContainer, getStore} = createStore(initialStore);

    const out = {
        Container,
        AsyncContainer,
        getStore,
    };

    if (options) {
        out.updateSpy = jest.spyOn(AsyncContainer.prototype, '_update');
        out.runAsyncSpy = jest.spyOn(AsyncContainer.prototype, '_runAsync');

        out.container = new AsyncContainer(options);

        out.subscribeSpy = jest.fn(() => {});
        out.container._subscribe(out.subscribeSpy);
    }

    return out;
}

describe('Container()', () => {
    it('should have a setState method that takes either a function or an object as an argument', () => {
        const {Container} = setupStore();
        const counter = new Container({value: 1});

        expect(counter.state).toEqual({value: 1});

        counter.setState({value: 2});
        expect(counter.state).toEqual({value: 2});

        counter.setState({didCount: true});
        expect(counter.state).toEqual({value: 2, didCount: true});

        counter.setState(s => ({value: s.value + 1}));
        expect(counter.state).toEqual({value: 3, didCount: true});
    });

    it('should allow to subscribe and unsubscribe', () => {
        const {Container} = setupStore();
        const counter = new Container({value: 1});

        const subscribeSpy1 = jest.fn(() => {});
        counter._subscribe(subscribeSpy1);
        expect(counter._listeners).toEqual([subscribeSpy1]);

        counter.setState({value: 2});
        expect(subscribeSpy1).toHaveBeenCalledTimes(1);

        const subscribeSpy2 = jest.fn(() => {});
        counter._subscribe(subscribeSpy2);
        expect(counter._listeners).toEqual([subscribeSpy1, subscribeSpy2]);

        counter.setState({value: 3});
        expect(subscribeSpy1).toHaveBeenCalledTimes(2);
        expect(subscribeSpy2).toHaveBeenCalledTimes(1);

        counter._unsubscribe(subscribeSpy1);
        expect(counter._listeners).toEqual([subscribeSpy2]);

        counter.setState({value: 4});
        expect(subscribeSpy1).toHaveBeenCalledTimes(2);
        expect(subscribeSpy2).toHaveBeenCalledTimes(2);
    });

    it('should not change state and call subscribed functions if setState returns undefined or null', () => {
        const {Container} = setupStore();
        const counter = new Container({value: 1});
        const subscribeSpy = jest.fn(() => {});
        counter._subscribe(subscribeSpy);

        const prevState = counter.state;

        counter.setState(undefined);
        expect(prevState).toBe(counter.state);
        expect(subscribeSpy).toHaveBeenCalledTimes(0);

        counter.setState(null);
        expect(prevState).toBe(counter.state);
        expect(subscribeSpy).toHaveBeenCalledTimes(0);

        counter.setState(() => undefined);
        expect(prevState).toBe(counter.state);
        expect(subscribeSpy).toHaveBeenCalledTimes(0);

        counter.setState(() => null);
        expect(prevState).toBe(counter.state);
        expect(subscribeSpy).toHaveBeenCalledTimes(0);
    });

    it('should add a container instances to the `containerMap` if `ssrKey` exists', () => {
        const {Container, getStore} = setupStore();
        new Container(undefined, {ssrKey: 'unique-key-1'}); // eslint-disable-line no-new
        new Container(undefined, {ssrKey: 'unique-key-2'}); // eslint-disable-line no-new

        expect(getStore()).toHaveProperty('unique-key-1');
        expect(getStore()).toHaveProperty('unique-key-2');
    });

    it('should not add a container instances to the `containerMap` if `ssrKey` does not exists', () => {
        const {Container, getStore} = setupStore();
        new Container(); // eslint-disable-line no-new

        expect(getStore()).toEqual({});
    });

    it('should throw if a container instance with such `ssrKey` has been already added', () => {
        const {Container} = setupStore();
        new Container({}, {ssrKey: 'unique-key-1'}); // eslint-disable-line no-new

        expect(() => new Container({}, {ssrKey: 'unique-key-1'})).toThrow();
    });
});

describe('AsyncContainer()', () => {
    it('should default `mapPropsToArgs` to a function that returns an empty array', () => {
        const {AsyncContainer} = setupStore();
        const container = new AsyncContainer({promise: () => delay(100, {})});

        expect(container._mapPropsToArgs()).toEqual([]);
    });

    it('should not run promises if both `autoRefresh` and `isForced` are false', async () => {
        const options = {
            mapPropsToArgs: () => ['foo'],
            promise: value => delay(200, {value}),
            autoRefresh: false,
        };

        const {container, updateSpy, runAsyncSpy} = setupStore({options});

        container._runAsync();
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

        const {container, updateSpy, runAsyncSpy} = setupStore({options});

        container._runAsync({isForced: true});
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

        const {container, updateSpy, runAsyncSpy} = setupStore({options});

        container._runAsync();
        expect(container._cache.awaiting).toMatchObject([['foo']]);

        container._runAsync();
        expect(container._cache.awaiting).toMatchObject([['foo']]);

        container._runAsync();
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

        const {container, updateSpy} = setupStore({options});

        await container._runAsync();
        expect([container.state, container._meta]).toMatchSnapshot();

        container._runAsync({isForced: true});
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

        const {container, updateSpy, runAsyncSpy} = setupStore({options});

        container._runAsync();
        expect(container._cache.awaiting).toMatchObject([['foo']]);

        await delay(250);
        expect(container._cache.awaiting).toMatchObject([]);

        container._runAsync();
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

        const {container, updateSpy, runAsyncSpy} = setupStore({options});

        container._runAsync({isForced: true});
        expect(container._cache.awaiting).toMatchObject([['foo']]);

        await delay(250);
        expect(container._cache.awaiting).toMatchObject([]);

        container._runAsync({isForced: true});
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

        const {container, updateSpy, runAsyncSpy} = setupStore({options});

        container._runAsync();
        expect(container._cache.awaiting).toMatchObject([[null]]);

        await delay(150);
        expect(container._cache.awaiting).toMatchObject([]);

        container._runAsync();
        expect(container._cache.awaiting).toMatchObject([]);

        expect(updateSpy).toHaveBeenCalledTimes(3);
        expect(runAsyncSpy).toHaveBeenCalledTimes(2);
        expect([container.state, container._meta]).toMatchSnapshot();
    });

    it('should not run promises if `mapPropsToArgs` returns null', async () => {
        const date = Date.now();

        const options = {
            mapPropsToArgs: () => {
                if (Date.now() - date < 500) {
                    return null;
                }
                return ['foo'];
            },
            promise: value => delay(200, {value}),
        };

        const {container, updateSpy, runAsyncSpy} = setupStore({options});

        container._runAsync();
        expect(container._cache.awaiting).toMatchObject([]);

        await delay(250);
        expect(updateSpy).toHaveBeenCalledTimes(0);
        expect(runAsyncSpy).toHaveBeenCalledTimes(1);
        expect([container.state, container._meta]).toMatchSnapshot(); // pending

        await delay(300);
        container._runAsync();
        expect(container._cache.awaiting).toMatchObject([['foo']]);

        await delay(250);
        expect(updateSpy).toHaveBeenCalledTimes(2);
        expect(runAsyncSpy).toHaveBeenCalledTimes(2);
        expect([container.state, container._meta]).toMatchSnapshot(); // fulfilled
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

        const {container, updateSpy, runAsyncSpy} = setupStore({options, initialStore});

        await container._runAsync();

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

        const {container, updateSpy} = setupStore({options});

        await container._runAsync();
        await container._runAsync();

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

        const {container} = setupStore({options});

        await container._runAsync();
        expect([container.state, container._meta]).toMatchSnapshot(); // foo-false

        await container._runAsync();
        expect([container.state, container._meta]).toMatchSnapshot(); // foo-true

        await container._runAsync();
        expect([container.state, container._meta]).toMatchSnapshot(); // foo-false
    });

    it('should respect `maxArgs` when caches values', async () => {
        const options = {
            mapPropsToArgs: () => [null, Date.now()],
            promise: () => delay(100),
            maxArgs: 1,
        };

        const {container} = setupStore({options});

        container._runAsync({isForced: true});
        expect(container._cache.awaiting).toMatchObject([[null]]);

        await delay(150);
        expect(container._cache.awaiting).toMatchObject([]);

        container._runAsync({isForced: true});
        expect(container._cache.awaiting).toMatchObject([[null]]);

        await delay(150);
        expect(container._cache.awaiting).toMatchObject([]);
    });

    it('should not call `onExpire` for removed cache values', async () => {
        const options = {
            mapPropsToArgs: () => ['foo'],
            promise: () => delay(100),
            maxAge: 700,
        };

        const {container, runAsyncSpy} = setupStore({options});

        await container._runAsync();
        expect(container._cache.memoized.keys()).toEqual([['foo']]);

        container._cache.memoized.remove(['foo']);
        expect(container._cache.memoized.keys()).toEqual([]);

        await container._runAsync();
        expect(container._cache.memoized.keys()).toEqual([['foo']]);

        await delay(750);

        expect(runAsyncSpy).toHaveBeenCalledTimes(3);
    });
});
