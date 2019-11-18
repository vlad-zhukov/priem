import * as React from 'react';
import delay from 'delay';
import {render, cleanup, act, fireEvent} from '@testing-library/react';
import {createResource, hydrateStore, Options} from '../index';
import {Resource} from '../Resource';

const readSpy = jest.spyOn(Resource.prototype, 'read');
const updateSpy = jest.spyOn(Resource.prototype, 'update');
const onCacheChangeSpy = jest.spyOn(Resource.prototype, 'onCacheChange');

let timers: number[] = [];
const originalSetTimeout = window.setTimeout;
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
window.setTimeout = (handler, timeout, ...args) => {
    timers.push(originalSetTimeout(handler, timeout, ...args));
};

afterEach(() => {
    timers.filter(window.clearTimeout);
    timers = [];
    readSpy.mockClear();
    updateSpy.mockClear();
    onCacheChangeSpy.mockClear();
    cleanup();
});

it('should not run if `args` is `undefined`', async () => {
    const useResource = createResource(() => delay(200, {value: 'foo'}));

    const useResourceSpy = jest.fn(args => {
        const ret = useResource(args);
        delete ret[1].invalidate;
        return ret;
    });

    function Comp(props: {args: {} | undefined}) {
        useResourceSpy(props.args);
        return null;
    }

    const {rerender} = render(<Comp args={{}} />);
    await act(() => delay(300));

    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledTimes(2);
    expect(useResourceSpy).toHaveLastReturnedWith([
        'foo',
        {
            fulfilled: true,
            pending: false,
            rejected: false,
        },
    ]);

    rerender(<Comp args={undefined} />);
    await act(() => delay(300));

    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledTimes(2);
    expect(useResourceSpy).toHaveLastReturnedWith([
        undefined,
        {
            fulfilled: false,
            pending: false,
            rejected: false,
        },
    ]);
});

it('should rerun promises when cache expires if `maxAge` is set', async () => {
    /**
     * ASYNC UPDATE FLOW.
     * Numbers mean the order of function calls.
     *
     *                   | useResource | Resource#update | Resource#onCacheChange
     * ------------------|-------------|-----------------|------------------------
     *  mount (pending)  | 1           | 2               | 3
     *  fulfilled        | 4           |                 |
     *  props (pending)  | 5           | 6               | 7
     *  fulfilled        | 9           |                 |
     *  expire (pending) | 10          | 11              | 12
     *  fulfilled        | 13          |                 |
     */

    const useResource = createResource<string, {value: string}>(({value}) => delay(200, {value}), {maxSize: 10});

    const useResourceSpy = jest.fn(useResource);
    function getLastReturn(): string | undefined {
        const res = useResourceSpy.mock.results.slice(-1).pop();
        expect(Array.isArray(res!.value)).toBeTruthy();
        return res!.value[0];
    }

    function Comp({count}: {count: string}) {
        useResourceSpy({value: `foo${count}`}, {maxAge: 1000});
        return null;
    }

    const {rerender} = render(<Comp count="1" />);

    // mount (pending)

    expect(getLastReturn()).toBe(undefined);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);

    await act(() => delay(300));

    // fulfilled

    expect(getLastReturn()).toBe('foo1');
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);

    // wait to prevent debouncing
    await act(() => delay(200));
    rerender(<Comp count="2" />);

    // change props (pending)

    expect(getLastReturn()).toBe('foo1');
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);

    await act(() => delay(200));

    // fulfilled

    expect(getLastReturn()).toBe('foo2');
    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);

    await act(() => delay(1000));

    // expire (pending)

    expect(getLastReturn()).toBe('foo2');
    expect(useResourceSpy).toHaveBeenCalledTimes(6);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(5);

    await act(() => delay(200));

    // fulfilled

    expect(getLastReturn()).toBe('foo2');
    expect(useResourceSpy).toHaveBeenCalledTimes(7);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(6);
});

it('should have a `invalidate` method', async () => {
    let shouldReject = false;
    const useResource = createResource<string, {value: string}>(
        ({value}) => {
            if (!shouldReject) {
                shouldReject = true;
                return delay(100, {value});
            }
            return delay.reject(10, {value: new Error('error!')});
        },
        {
            maxSize: 10,
        },
    );

    const useResourceSpy = jest.fn(useResource);

    function Comp() {
        const [data, {reason, invalidate}] = useResourceSpy({value: 'foo'});
        expect(typeof invalidate).toBe('function');
        return (
            <>
                <button type="button" onClick={invalidate}>
                    {data}
                </button>
                {reason && <p>{reason.message}</p>}
            </>
        );
    }

    const {container} = render(<Comp />);

    expect(container.children).toMatchInlineSnapshot(`
        HTMLCollection [
          <button
            type="button"
          />,
        ]
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledTimes(1);

    await act(() => delay(200));

    expect(container.children).toMatchInlineSnapshot(`
        HTMLCollection [
          <button
            type="button"
          >
            foo
          </button>,
        ]
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(container.children).toMatchInlineSnapshot(`
        HTMLCollection [
          <button
            type="button"
          >
            foo
          </button>,
        ]
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(3);

    await act(() => delay(100));

    expect(container.children).toMatchInlineSnapshot(`
        HTMLCollection [
          <button
            type="button"
          >
            foo
          </button>,
          <p>
            error!
          </p>,
        ]
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(readSpy).toHaveBeenCalledTimes(4);

    await act(() => delay(500));

    expect(container.children).toMatchInlineSnapshot(`
        HTMLCollection [
          <button
            type="button"
          >
            foo
          </button>,
          <p>
            error!
          </p>,
        ]
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(readSpy).toHaveBeenCalledTimes(4);
});

it('should throttle invalidations', async () => {
    const useResource = createResource<{data: string}, {data: string}>(({data}) => delay(100, {value: {data}}), {
        maxSize: 10,
    });

    const useResourceSpy = jest.fn(useResource);
    function getLastReturn(): {data: string} | undefined {
        const res = useResourceSpy.mock.results.slice(-1).pop();
        expect(Array.isArray(res!.value)).toBeTruthy();
        return res!.value[0];
    }

    const dataRef: {current?: {data: string}} = {};

    function Comp() {
        const [, meta] = useResourceSpy({data: 'foo'});
        return <button type="button" onClick={meta.invalidate} />;
    }

    const {container} = render(<Comp />);
    const buttonElement = container.querySelector('button') as HTMLButtonElement;

    let lastReturn = getLastReturn();
    expect(lastReturn).toBe(undefined);

    await act(() => delay(200));

    lastReturn = getLastReturn();
    dataRef.current = lastReturn;
    expect(lastReturn).toEqual({data: 'foo'});
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(buttonElement);
    fireEvent.click(buttonElement);
    fireEvent.click(buttonElement);

    lastReturn = getLastReturn();
    expect(lastReturn).toBe(dataRef.current);
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(5);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(4);

    await act(() => delay(200));

    lastReturn = getLastReturn();
    expect(lastReturn).not.toBe(dataRef.current);
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(readSpy).toHaveBeenCalledTimes(6);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(5);
});

it('should render a nested component', async () => {
    const useResource1 = createResource<string, {value: string}>(({value}) => delay(100, {value}));
    const useResource2 = createResource<string, {res1Value: string; value: string}>(({res1Value, value}) =>
        delay(100, {value: res1Value + value}),
    );

    function Comp() {
        const [data1] = useResource1({value: 'foo'});
        const [data2] = useResource2(!data1 ? undefined : {res1Value: data1, value: 'bar'});
        return <div>{data2}</div>;
    }

    const {container} = render(<Comp />);

    await act(() => delay(400));

    expect(container.children).toMatchInlineSnapshot(`
        HTMLCollection [
          <div>
            foobar
          </div>,
        ]
    `);
});

it('should render `useResource` hooks that are subscribed to the same resource but need different data', async () => {
    const useResource = createResource<string, {value: string}>(({value}) => delay(100, {value}), {
        maxSize: 2,
    });

    function Comp() {
        const [data1] = useResource({value: 'foo'});
        const [data2] = useResource({value: 'bar'});
        return (
            <div>
                <div>{data1}</div>
                <div>{data2}</div>
            </div>
        );
    }

    const {container} = render(<Comp />);
    await act(() => delay(300));

    expect(container.children).toMatchInlineSnapshot(`
        HTMLCollection [
          <div>
            <div>
              foo
            </div>
            <div>
              bar
            </div>
          </div>,
        ]
    `);
});

it('should debounce calls', async () => {
    const useResource = createResource<string, {value: string}>(({value}) => delay(200, {value}), {
        maxSize: 10,
    });

    const useResourceSpy = jest.fn((args: {value: string}) => {
        const ret = useResource(args);
        delete ret[1].invalidate;
        return ret;
    });

    const Comp: React.FC<{arg: string}> = props => {
        useResourceSpy({value: props.arg});
        return null;
    };

    const {rerender} = render(<Comp arg="foo" />);
    rerender(<Comp arg="bar" />);
    rerender(<Comp arg="baz" />);

    expect(useResourceSpy).toHaveLastReturnedWith([
        undefined,
        {
            fulfilled: false,
            pending: true,
            rejected: false,
        },
    ]);
    expect(readSpy).toHaveBeenCalledTimes(1);

    await act(() => delay(200));

    expect(useResourceSpy).toHaveLastReturnedWith([
        undefined,
        {
            fulfilled: false,
            pending: true,
            rejected: false,
        },
    ]);
    expect(readSpy).toHaveBeenCalledTimes(3);

    await act(() => delay(200));

    expect(useResourceSpy).toHaveLastReturnedWith([
        'baz',
        {
            fulfilled: true,
            pending: false,
            reason: undefined,
            rejected: false,
        },
    ]);
    expect(readSpy).toHaveBeenCalledTimes(4);

    await act(() => delay(300));

    expect(useResourceSpy).toHaveLastReturnedWith([
        'baz',
        {
            fulfilled: true,
            pending: false,
            reason: undefined,
            rejected: false,
        },
    ]);
    expect(readSpy).toHaveBeenCalledTimes(4);
});

it('should invalidate on mount when `refreshOnMount` is set', async () => {
    let counter = 0;
    const useResource = createResource<number, {}>(() => delay(200, {value: counter += 1}));

    const useResourceSpy = jest.fn((args: Record<string, unknown>, opts?: Options) => {
        const ret = useResource(args, opts);
        delete ret[1].invalidate;
        return ret;
    });

    function Comp() {
        useResourceSpy({}, {refreshOnMount: true});
        return null;
    }

    const {unmount, rerender} = render(<Comp />);
    await act(() => delay(300));

    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledTimes(2);
    expect(useResourceSpy).toHaveLastReturnedWith([
        1,
        {
            fulfilled: true,
            pending: false,
            rejected: false,
        },
    ]);

    unmount();
    rerender(<Comp />);
    await act(() => delay(300));

    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(4);
    expect(useResourceSpy).toHaveLastReturnedWith([
        2,
        {
            fulfilled: true,
            pending: false,
            rejected: false,
        },
    ]);
});

it('should hydrate data', async () => {
    hydrateStore([
        [
            'unique-key-1',
            [
                {
                    key: {
                        value: 'foo',
                    },
                    value: {
                        data: 'foo',
                        reason: undefined,
                        status: 1,
                    },
                },
            ],
        ],
        [
            'unique-key-2',
            [
                {
                    key: {
                        res1Value: 'foo',
                        value: 'bar',
                    },
                    value: {
                        data: 'foobar',
                        reason: undefined,
                        status: 1,
                    },
                },
            ],
        ],
    ]);

    const useResource1 = createResource<string, {value: string}>(({value}) => delay(100, {value}), {
        ssrKey: 'unique-key-1',
    });

    const useResource2 = createResource<string, {res1Value: string; value: string}>(
        ({res1Value, value}) => delay(100, {value: res1Value + value}),
        {
            ssrKey: 'unique-key-2',
        },
    );

    function Comp() {
        const [data1] = useResource1({value: 'foo'}, {maxAge: 1000});
        const [data2] = useResource2(!data1 ? undefined : {res1Value: data1, value: 'bar'});
        return <div>{data2}</div>;
    }

    const {container} = render(<Comp />);

    expect(container).toMatchInlineSnapshot(`
        <div>
          <div>
            foobar
          </div>
        </div>
    `);

    await act(() => delay(1000));

    expect(container).toMatchInlineSnapshot(`
        <div>
          <div>
            foobar
          </div>
        </div>
    `);
});
