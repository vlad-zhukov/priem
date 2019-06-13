import * as React from 'react';
import delay from 'delay';
import {render, cleanup, act, fireEvent} from '@testing-library/react';
import {createResource} from '../index';
import {Resource} from '../Resource';

const getSpy = jest.spyOn(Resource.prototype, 'get');
const onCacheChangeSpy = jest.spyOn(Resource.prototype, 'onCacheChange');

afterEach(() => {
    getSpy.mockClear();
    onCacheChangeSpy.mockClear();
    cleanup();
});

it('should not run if `args` is `null`', async () => {
    const useResource = createResource<string>(() => delay(200, {value: 'foo'}));

    const useResourceSpy = jest.fn(args => {
        const ret = useResource(args);
        delete ret[1].refresh;
        return ret;
    });

    const Comp: React.FC = () => {
        useResourceSpy(null);
        return null;
    };

    render(<Comp />);

    await act(async () => {
        await delay(300);
    });

    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);
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
     *                   | usePriem | Resource#onCacheChange | Resource#get
     * ------------------|----------|------------------------|---------------
     *  mount (pending)  | 1        |                        | 2
     *  fulfilled        | 4        | 3                      | 5
     *  props (pending)  | 6        |                        | 7
     *  fulfilled        | 9        | 8                      | 10
     *  expire (pending) | 12       | 11                     | 13
     *  fulfilled        | 15       | 14                     | 16
     */

    const useResource = createResource<string, [string]>(value => delay(200, {value}), {
        maxAge: 1000,
    });

    const useResourceSpy = jest.fn(useResource);

    const Comp: React.FC<{count: string}> = ({count}) => {
        const [data] = useResourceSpy([`foo${count}`]);
        return <div>{data}</div>;
    };

    const {container, rerender} = render(<Comp count="1" />);

    // mount (pending)

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div />,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
        await delay(300);
    });

    // fulfilled

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo1
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(2);

    rerender(<Comp count="2" />);

    // change props (pending)

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo1
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
        await delay(400);
    });

    // fulfilled

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo2
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(5);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(4);

    await act(async () => {
        await delay(400);
    });

    // expire (pending)

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo2
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(5);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(4);

    await act(async () => {
        await delay(200);
    });

    // fulfilled

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo2
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(5);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(4);
});

it('should have a `refresh` method', async () => {
    let shouldReject = false;
    const useResource = createResource<string, [string]>(
        value => {
            if (shouldReject) {
                return delay.reject(10, {value: new Error('error!')});
            }
            shouldReject = true;
            return delay(100, {value});
        },
        {
            maxSize: 10,
        }
    );

    const useResourceSpy = jest.fn(useResource);

    function Comp() {
        const [data, {reason, refresh}] = useResourceSpy(['foo']);
        expect(typeof refresh).toBe('function');
        return (
            <>
                <button type="button" onClick={refresh}>
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
    expect(getSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
        await delay(200);
    });

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
    expect(getSpy).toHaveBeenCalledTimes(2);

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
    expect(useResourceSpy).toHaveBeenCalledTimes(3);
    expect(getSpy).toHaveBeenCalledTimes(3);

    await act(async () => {
        await delay(100);
    });

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
    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(getSpy).toHaveBeenCalledTimes(4);

    await act(async () => {
        await delay(500);
    });

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
    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(getSpy).toHaveBeenCalledTimes(4);
});

it('should render a nested component', async () => {
    const useResource1 = createResource<string, [string]>(value => delay(100, {value}));
    const useResource2 = createResource<string, string[]>((res1Value, value) => delay(100, {value: res1Value + value}));

    function Comp() {
        const [data1] = useResource1(['foo']);
        const [data2] = useResource2(!data1 ? null : [data1, 'bar']);
        return <div>{data2}</div>;
    }

    const {container} = render(<Comp />);

    await act(async () => {
        await delay(400);
    });

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foobar
  </div>,
]
`);
});

it('should render `usePriem` hooks that are subscribed to the same resource but need different data', async () => {
    const useResource = createResource<string, [string]>(value => delay(100, {value}), {
        maxSize: 2,
    });

    function Comp() {
        const [data1] = useResource(['foo']);
        const [data2] = useResource(['bar']);
        return (
            <div>
                <div>{data1}</div>
                <div>{data2}</div>
            </div>
        );
    }

    const {container} = render(<Comp />);

    await act(async () => {
        await delay(300);
    });

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
    const useResource = createResource<string, [string]>(value => delay(200, {value}), {
        maxSize: 10,
    });

    const useResourceSpy = jest.fn((args: [string]) => {
        const ret = useResource(args);
        delete ret[1].refresh;
        return ret;
    });

    const Comp: React.FC<{arg: string}> = props => {
        useResourceSpy([props.arg]);
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
    expect(getSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
        await delay(200);
    });

    expect(useResourceSpy).toHaveLastReturnedWith([
        undefined,
        {
            fulfilled: false,
            pending: true,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
        await delay(200);
    });

    expect(useResourceSpy).toHaveLastReturnedWith([
        'baz',
        {
            fulfilled: true,
            pending: false,
            reason: undefined,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(3);

    await act(async () => {
        await delay(300);
    });

    expect(useResourceSpy).toHaveLastReturnedWith([
        'baz',
        {
            fulfilled: true,
            pending: false,
            reason: undefined,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(3);
});

it('should rerender on mount', async () => {
    let counter = 0;
    const useResource = createResource<number>(() => delay(200, {value: counter += 1}), {refreshOnMount: true});

    const useResourceSpy = jest.fn(args => {
        const ret = useResource(args);
        delete ret[1].refresh;
        return ret;
    });

    const Comp: React.FC = () => {
        useResourceSpy([]);
        return null;
    };

    const {unmount, rerender} = render(<Comp />);

    await act(async () => {
        await delay(300);
    });

    expect(useResourceSpy).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(2);
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

    await act(async () => {
        await delay(300);
    });

    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(4);
    expect(useResourceSpy).toHaveLastReturnedWith([
        2,
        {
            fulfilled: true,
            pending: false,
            rejected: false,
        },
    ]);
});
