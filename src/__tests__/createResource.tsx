import * as React from 'react';
import delay from 'delay';
import {render, cleanup, flushEffects, fireEvent} from 'react-testing-library';
import {createResource} from '../index';
import {Resource} from '../Resource';

async function waitEffects() {
    flushEffects();
    await delay(50);
}

const getSpy = jest.spyOn(Resource.prototype, 'get');
const onCacheChangeSpy = jest.spyOn(Resource.prototype, 'onCacheChange');

afterEach(() => {
    getSpy.mockClear();
    onCacheChangeSpy.mockClear();
    cleanup();
});

it('should not run if `args` is `null`', async () => {
    const useResource = createResource(value => delay(200, {value}));

    const useResourceSpy = jest.fn(args => {
        const ret = useResource(args);
        delete ret[1].refresh;
        return ret;
    });

    const Comp: React.FunctionComponent = () => {
        useResourceSpy(null);
        return null;
    };

    render(<Comp />);
    await delay(300);
    await waitEffects();

    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(useResourceSpy).toHaveLastReturnedWith([
        null,
        {
            fulfilled: false,
            pending: false,
            reason: null,
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

    const useResource = createResource(value => delay(200, {value}), {
        maxAge: 1000,
    });

    const useResourceSpy = jest.fn(useResource);

    const Comp: React.FunctionComponent<{count: string}> = ({count}) => {
        const [data] = useResourceSpy([`foo${count}`]);
        return <div>{data}</div>;
    };

    const {container, rerender} = render(<Comp count="1" />);
    await waitEffects();

    // mount (pending)

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div />,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);

    await delay(300);
    await waitEffects();

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
    await waitEffects();

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
    expect(getSpy).toHaveBeenCalledTimes(3);

    await delay(400);
    await waitEffects();

    // fulfilled

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo2
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(4);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(4);

    await delay(500);
    await waitEffects();

    // expire (pending)

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo2
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(5);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(3);
    expect(getSpy).toHaveBeenCalledTimes(5);

    await delay(200);
    await waitEffects();

    // fulfilled

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foo2
  </div>,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(6);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(4);
    expect(getSpy).toHaveBeenCalledTimes(6);
});

it('should have a `refresh` method', async () => {
    let shouldReject = false;
    const useResource = createResource(
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
    await waitEffects();

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <button
    type="button"
  />,
]
`);
    expect(useResourceSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(1);

    await delay(200);

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

    await delay(100);

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

    await delay(500);

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
    const useResource1 = createResource(value => delay(100, {value}));
    const useResource2 = createResource((res1Value, value) => delay(100, {value: res1Value + value}));

    function Comp() {
        const [data1] = useResource1(['foo']);
        const [data2] = useResource2(!data1 ? null : [data1, 'bar']);
        return <div>{data2}</div>;
    }

    const {container} = render(<Comp />);
    await waitEffects();
    await delay(400);

    expect(container.children).toMatchInlineSnapshot(`
HTMLCollection [
  <div>
    foobar
  </div>,
]
`);
});

it('should render `usePriem` hooks that are subscribed to the same resource but need different data', async () => {
    const useResource = createResource(value => delay(100, {value}), {
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
    await waitEffects();

    await delay(300);

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
    const useResource = createResource(value => delay(200, {value}), {
        maxSize: 10,
    });

    const useResourceSpy = jest.fn((args: unknown[]) => {
        const ret = useResource(args);
        delete ret[1].refresh;
        return ret;
    });

    const Comp: React.FunctionComponent<{arg: unknown}> = props => {
        useResourceSpy([props.arg]);
        return null;
    };

    const {rerender} = render(<Comp arg="foo" />);
    rerender(<Comp arg="bar" />);
    rerender(<Comp arg="baz" />);

    await waitEffects();

    expect(useResourceSpy).toHaveLastReturnedWith([
        null,
        {
            fulfilled: false,
            pending: true,
            reason: null,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(1);

    await delay(200);

    expect(useResourceSpy).toHaveLastReturnedWith([
        null,
        {
            fulfilled: false,
            pending: true,
            reason: null,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(2);

    await delay(200);
    await waitEffects();

    expect(useResourceSpy).toHaveLastReturnedWith([
        'baz',
        {
            fulfilled: true,
            pending: false,
            reason: null,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(3);

    await delay(300);
    await waitEffects();

    expect(useResourceSpy).toHaveLastReturnedWith([
        'baz',
        {
            fulfilled: true,
            pending: false,
            reason: null,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(3);
});
