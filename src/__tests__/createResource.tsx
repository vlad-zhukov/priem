import * as React from 'react';
import delay from 'delay';
import {render, cleanup, act, fireEvent} from '@testing-library/react';
import {createResource, hydrateStore, Options, ResultPages} from '../index';
import {Resource} from '../Resource';

const readSpy = jest.spyOn(Resource.prototype, 'read');
const updateSpy = jest.spyOn(Resource.prototype, 'update');
const onCacheChangeSpy = jest.spyOn(Resource.prototype, 'onCacheChange');

let navigatorOnline = window.navigator.onLine;
Object.defineProperty(window.navigator, 'onLine', {
    get() {
        return navigatorOnline;
    },
});

function goOffline() {
    navigatorOnline = false;
    window.dispatchEvent(new window.Event('offline'));
}

function goOnline() {
    navigatorOnline = true;
    window.dispatchEvent(new window.Event('online'));
}

let documentHidden = window.document.hidden;
Object.defineProperty(window.document, 'hidden', {
    get() {
        return documentHidden;
    },
});

function hideWindow() {
    documentHidden = true;
    window.dispatchEvent(new window.Event('visibilitychange'));
}

function showWindow() {
    documentHidden = false;
    window.dispatchEvent(new window.Event('visibilitychange'));
}

let timerIds: number[] = [];
const originalSetTimeout = window.setTimeout;
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
window.setTimeout = (handler, timeout, ...args) => {
    const timerId = originalSetTimeout(handler, timeout, ...args);
    timerIds.push(timerId);
    return timerId;
};

afterEach(() => {
    timerIds.filter(window.clearTimeout);
    timerIds = [];
    navigatorOnline = true;
    documentHidden = false;
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

    const useResource = createResource<string, {value: string}>(({value}) => delay(200, {value}));

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
    expect(useResourceSpy).toHaveBeenCalledTimes(5);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(4);

    await act(() => delay(200));

    // fulfilled

    expect(getLastReturn()).toBe('foo2');
    expect(useResourceSpy).toHaveBeenCalledTimes(6);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(5);
});

it('should have `invalidate` method', async () => {
    let shouldReject = false;
    const useResource = createResource<string, {value: string}>(({value}) => {
        if (!shouldReject) {
            shouldReject = true;
            return delay(100, {value});
        }
        return delay.reject(10, {value: new Error('error!')});
    });

    const useResourceSpy = jest.fn(useResource);

    function Comp({noValue = false}: {noValue?: boolean}) {
        const [data, {reason, invalidate}] = useResourceSpy(noValue ? undefined : {value: 'foo'});
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

    const {container, rerender} = render(<Comp />);

    expect(container).toMatchInlineSnapshot(`
        <div>
          <button
            type="button"
          />
        </div>
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledTimes(1);

    await act(() => delay(200));

    expect(container).toMatchInlineSnapshot(`
        <div>
          <button
            type="button"
          >
            foo
          </button>
        </div>
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(container).toMatchInlineSnapshot(`
        <div>
          <button
            type="button"
          >
            foo
          </button>
        </div>
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(3);

    await act(() => delay(100));

    expect(container).toMatchInlineSnapshot(`
        <div>
          <button
            type="button"
          >
            foo
          </button>
          <p>
            error!
          </p>
        </div>
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(readSpy).toHaveBeenCalledTimes(4);

    await act(() => delay(500));

    expect(container).toMatchInlineSnapshot(`
        <div>
          <button
            type="button"
          >
            foo
          </button>
          <p>
            error!
          </p>
        </div>
    `);
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(readSpy).toHaveBeenCalledTimes(4);

    rerender(<Comp noValue={true} />);

    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(readSpy).toHaveBeenCalledTimes(4);

    fireEvent.click(container.querySelector('button') as HTMLButtonElement);

    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(readSpy).toHaveBeenCalledTimes(4);
});

it('should throttle invalidations', async () => {
    const useResource = createResource<{data: string}, {data: string}>(({data}) => delay(100, {value: {data}}));

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

it('should render `useResource` hooks that are subscribed to the same resource but need different data', async () => {
    const useResource = createResource<string, {value: string}>(({value}) => delay(100, {value}), {});

    function Comp() {
        const [data1] = useResource({value: 'foo'});
        const [data2] = useResource({value: 'bar'});
        return (
            <div>
                {data1}
                {data2}
            </div>
        );
    }

    const {container} = render(<Comp />);
    await act(() => delay(200));

    expect(container).toMatchInlineSnapshot(`
        <div>
          <div>
            foo
            bar
          </div>
        </div>
    `);
});

it('should debounce calls', async () => {
    const useResource = createResource<string, {value: string}>(({value}) => delay(200, {value}));

    const useResourceSpy = jest.fn((args: {value: string}) => {
        const ret = useResource(args);
        delete ret[1].invalidate;
        return ret;
    });

    function Comp(props: {arg: string}) {
        useResourceSpy({value: props.arg});
        return null;
    }

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
    expect(readSpy).toHaveBeenCalledTimes(2);

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
    expect(readSpy).toHaveBeenCalledTimes(3);

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
    expect(readSpy).toHaveBeenCalledTimes(3);
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

    expect(useResourceSpy).toHaveLastReturnedWith([
        undefined,
        {
            fulfilled: false,
            pending: true,
            rejected: false,
        },
    ]);

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

it('should schedule updates when browser is offline', async () => {
    const useResource = createResource<string, {}>(() => delay(100, {value: 'foo'}));
    const useResourceSpy = jest.fn(useResource);

    function Comp() {
        useResourceSpy({}, {maxAge: 500});
        return null;
    }

    render(<Comp />);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    await act(() => delay(100));
    expect(useResourceSpy).toHaveBeenCalledTimes(2);

    act(() => goOffline());
    await act(() => delay(700));
    expect(useResourceSpy).toHaveBeenCalledTimes(2);

    act(() => goOnline());
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    await act(() => delay(100));
    expect(useResourceSpy).toHaveBeenCalledTimes(4);
});

it('should schedule updates when browser tab is not active', async () => {
    const useResource = createResource<string, {}>(() => delay(100, {value: 'foo'}));
    const useResourceSpy = jest.fn(useResource);

    function Comp() {
        useResourceSpy({}, {maxAge: 500});
        return null;
    }

    render(<Comp />);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    await act(() => delay(100));
    expect(useResourceSpy).toHaveBeenCalledTimes(2);

    act(() => hideWindow());
    await act(() => delay(700));
    expect(useResourceSpy).toHaveBeenCalledTimes(2);

    act(() => showWindow());
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    await act(() => delay(100));
    expect(useResourceSpy).toHaveBeenCalledTimes(4);
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

it('should have paged hook variant', async () => {
    const variants = ['foo', 'bar', 'baz', 'qux', 'quux'];
    let currentVariant = 0;

    function buildRandomValueList(length: number, offset: number): string[] {
        const valueList = [];

        for (let i = offset; i < offset + length; i++) {
            valueList.push(variants[currentVariant] + '-' + i);
            if (currentVariant < 4) {
                currentVariant += 1;
            } else {
                currentVariant = 0;
            }
        }

        return valueList;
    }

    const useResource = createResource<string[], {shouldReject: boolean; length: number; offset: number}>(args => {
        if (args.shouldReject) {
            return delay.reject(100);
        }
        return delay(100, {value: buildRandomValueList(args.length, args.offset)});
    });

    const useResourcePagesSpy = jest.fn(useResource.pages);
    function getLastReturn(): ResultPages<string[]> {
        const res = useResourcePagesSpy.mock.results.slice(-1).pop();
        expect(Array.isArray(res!.value)).toBeTruthy();
        return res!.value;
    }

    function Comp() {
        const [counter, setCounter] = React.useState(0);
        const [shouldReject, setShouldReject] = React.useState(false);

        const [, meta] = useResourcePagesSpy(
            counter === 0
                ? undefined
                : prevArgs => ({
                      counter,
                      shouldReject,
                      length: 2,
                      offset: prevArgs ? prevArgs.offset + 2 : 0,
                  }),
        );

        return (
            <>
                <button onClick={() => setCounter(c => c + 1)} data-inccounter={true}>
                    Increase counter
                </button>
                <button onClick={meta.loadMore} data-loadmore={true}>
                    Load more
                </button>
                <button onClick={meta.invalidate} data-invalidate={true}>
                    Invalidate
                </button>
                <button onClick={() => setShouldReject(r => !r)} data-togglerejecting={true}>
                    Toggle rejecting
                </button>
            </>
        );
    }

    const {container} = render(<Comp />);
    const incCounterButton = container.querySelector('button[data-inccounter=true]') as HTMLButtonElement;
    const loadMoreButton = container.querySelector('button[data-loadmore=true]') as HTMLButtonElement;
    const invalidateButton = container.querySelector('button[data-invalidate=true]') as HTMLButtonElement;
    const toggleRejectingButton = container.querySelector('button[data-togglerejecting=true]') as HTMLButtonElement;

    await act(() => delay(100));

    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          undefined,
          Object {
            "fulfilled": false,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    fireEvent.click(incCounterButton);
    await act(() => delay(100));

    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "foo-0",
              "bar-1",
            ],
          ],
          Object {
            "fulfilled": true,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);

    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "foo-0",
              "bar-1",
            ],
          ],
          Object {
            "fulfilled": true,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    // debounced
    await act(() => delay(150));
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "foo-0",
              "bar-1",
            ],
          ],
          Object {
            "fulfilled": false,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": true,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    await act(() => delay(100));
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "foo-0",
              "bar-1",
            ],
            Array [
              "baz-2",
              "qux-3",
            ],
            Array [
              "quux-4",
              "foo-5",
            ],
          ],
          Object {
            "fulfilled": true,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    fireEvent.click(invalidateButton);

    await act(() => delay(100));
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "bar-0",
              "baz-1",
            ],
            Array [
              "qux-2",
              "quux-3",
            ],
            Array [
              "foo-4",
              "bar-5",
            ],
          ],
          Object {
            "fulfilled": true,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    fireEvent.click(incCounterButton);

    // debounced
    await act(() => delay(150));
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "bar-0",
              "baz-1",
            ],
            Array [
              "qux-2",
              "quux-3",
            ],
            Array [
              "foo-4",
              "bar-5",
            ],
          ],
          Object {
            "fulfilled": false,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": true,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    await act(() => delay(100));
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "baz-0",
              "qux-1",
            ],
          ],
          Object {
            "fulfilled": true,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    fireEvent.click(toggleRejectingButton);
    await act(() => delay(300)); // debounced (150) + promise resolution (100)
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "baz-0",
              "qux-1",
            ],
          ],
          Object {
            "fulfilled": false,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": true,
          },
        ]
    `);
});

it('should invalidate all pages on mount when `refreshOnMount` is set', async () => {
    const variants = ['foo', 'bar', 'baz', 'qux', 'quux'];
    let currentVariant = 0;

    function buildRandomValueList(length: number, offset: number): string[] {
        const valueList = [];

        for (let i = offset; i < offset + length; i++) {
            valueList.push(variants[currentVariant] + '-' + i);
            if (currentVariant < 4) {
                currentVariant += 1;
            } else {
                currentVariant = 0;
            }
        }

        return valueList;
    }

    const useResource = createResource<string[], {length: number; offset: number}>(args =>
        delay(100, {value: buildRandomValueList(args.length, args.offset)}),
    );

    const useResourcePagesSpy = jest.fn(useResource.pages);
    function getLastReturn(): ResultPages<string[]> {
        const res = useResourcePagesSpy.mock.results.slice(-1).pop();
        expect(Array.isArray(res!.value)).toBeTruthy();
        return res!.value;
    }

    function Comp() {
        const [, meta] = useResourcePagesSpy(
            prevArgs => ({
                length: 2,
                offset: prevArgs ? prevArgs.offset + 2 : 0,
            }),
            {refreshOnMount: true},
        );

        return (
            <button onClick={meta.loadMore} data-loadmore={true}>
                Load more
            </button>
        );
    }

    const {container, unmount, rerender} = render(<Comp />);
    let loadMoreButton = container.querySelector('button[data-loadmore=true]') as HTMLButtonElement;

    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);

    await act(() => delay(400));

    expect(updateSpy).toHaveBeenCalledTimes(4);
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "foo-0",
              "bar-1",
            ],
            Array [
              "baz-2",
              "qux-3",
            ],
            Array [
              "quux-4",
              "foo-5",
            ],
            Array [
              "bar-6",
              "baz-7",
            ],
          ],
          Object {
            "fulfilled": true,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);

    unmount();
    rerender(<Comp />);
    loadMoreButton = container.querySelector('button[data-loadmore=true]') as HTMLButtonElement;

    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);

    await act(() => delay(400));

    expect(updateSpy).toHaveBeenCalledTimes(5);
    expect(getLastReturn()).toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "qux-0",
              "quux-1",
            ],
            Array [
              "baz-2",
              "qux-3",
            ],
            Array [
              "quux-4",
              "foo-5",
            ],
          ],
          Object {
            "fulfilled": true,
            "invalidate": [Function],
            "loadMore": [Function],
            "pending": false,
            "reason": undefined,
            "rejected": false,
          },
        ]
    `);
});
