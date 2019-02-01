import * as React from 'react';
import delay from 'delay';
import {render, cleanup, flushEffects, fireEvent} from 'react-testing-library';
import {usePriem, Resource} from '../index';

async function waitEffects() {
    flushEffects();
    await delay(50);
}

/* eslint-disable react/no-unused-state */
class ErrorBoundary extends React.Component<unknown, {initTime: number; hasError?: Error; catchTime?: number}> {
    constructor(props: unknown) {
        super(props);
        this.state = {initTime: Date.now()};
    }

    componentDidCatch(error: Error) {
        this.setState({hasError: error, catchTime: Date.now()});
    }

    render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}

const getSpy = jest.spyOn(Resource.prototype, 'get');
const onCacheChangeSpy = jest.spyOn(Resource.prototype, 'onCacheChange');

afterEach(() => {
    getSpy.mockClear();
    onCacheChangeSpy.mockClear();
    cleanup();
});

it('should throw if `resource` is not a `Resource` instance', async () => {
    const usePriemSpy = jest.fn(usePriem);

    function Comp() {
        usePriemSpy({}, []);
        return null;
    }

    const ref = React.createRef<ErrorBoundary>();
    const element = (
        <ErrorBoundary ref={ref}>
            <Comp />
        </ErrorBoundary>
    );

    render(element);
    await waitEffects();

    await delay(500);

    expect(ref.current!.state.hasError).toMatchInlineSnapshot(
        `[TypeError: usePriem: 'resource' must be an instance of 'Resource'.]`
    );
});

it('should throw if `resource` is different after initializing', async () => {
    const res1 = new Resource(() => delay(100));
    const res2 = new Resource(() => delay(100));

    const usePriemSpy = jest.fn(usePriem);

    function Comp() {
        const [dummy, setDummy] = React.useState(true);
        usePriemSpy(dummy ? res1 : res2, []);
        setDummy(false);
        return null;
    }

    const ref = React.createRef<ErrorBoundary>();
    const element = (
        <ErrorBoundary ref={ref}>
            <Comp />
        </ErrorBoundary>
    );

    render(element);
    await waitEffects();

    await delay(500);

    expect(ref.current!.state.hasError).toMatchInlineSnapshot(
        `[TypeError: usePriem: it looks like you've passed a different 'resource' value after initializing.]`
    );
});

it('should not run if `args` is `null`', async () => {
    const res = new Resource(value => delay(200, {value}));

    const usePriemSpy = jest.fn(args => {
        const ret = usePriem(res, args);
        delete ret[1].refresh;
        return ret;
    });

    const Comp: React.FunctionComponent = () => {
        usePriemSpy(null);
        return null;
    };

    render(<Comp />);
    await delay(300);
    await waitEffects();

    expect(usePriemSpy).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(usePriemSpy).toHaveLastReturnedWith([
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

    const res = new Resource(value => delay(200, {value}), {
        maxAge: 1000,
    });

    const usePriemSpy = jest.fn(usePriem);

    const Comp: React.FunctionComponent<{count: string}> = ({count}) => {
        const [data] = usePriemSpy(res, [`foo${count}`]);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(1);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(2);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(3);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(4);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(5);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(6);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(4);
    expect(getSpy).toHaveBeenCalledTimes(6);
});

it('should have a `refresh` method', async () => {
    let shouldReject = false;
    const res = new Resource(
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

    const usePriemSpy = jest.fn(usePriem);

    function Comp() {
        const [data, {reason, refresh}] = usePriemSpy(res, ['foo']);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(1);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(2);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(3);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(4);
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
    expect(usePriemSpy).toHaveBeenCalledTimes(4);
    expect(getSpy).toHaveBeenCalledTimes(4);
});

it('should render a nested component', async () => {
    const res1 = new Resource(value => delay(100, {value}));
    const res2 = new Resource((res1Value, value) => delay(100, {value: res1Value + value}));

    const usePriemSpy = jest.fn(usePriem);

    function Comp() {
        const [data1] = usePriemSpy(res1, ['foo']);
        const [data2] = usePriemSpy(res2, !data1 ? null : [data1, 'bar']);
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
    const res = new Resource(value => delay(100, {value}), {
        maxSize: 2,
    });

    const usePriemSpy = jest.fn(usePriem);

    function Comp() {
        const [data1] = usePriemSpy(res, ['foo']);
        const [data2] = usePriemSpy(res, ['bar']);
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

it('should unsubscribe from resource on unmount', async () => {
    const res = new Resource(value => delay(100, {value}));

    const usePriemSpy = jest.fn(usePriem);

    function Comp() {
        usePriemSpy(res, ['foo']);
        return <div />;
    }

    const {unmount} = render(<Comp />);
    await waitEffects();

    // tslint:disable-next-line no-string-literal
    expect(res['listeners']).toHaveLength(1);

    unmount();
    await waitEffects();

    // tslint:disable-next-line no-string-literal
    expect(res['listeners']).toHaveLength(0);
});

it('should debounce calls', async () => {
    const res = new Resource(value => delay(200, {value}), {
        maxSize: 10,
    });

    const usePriemSpy = jest.fn((resource: Resource, args: unknown[]) => {
        const ret = usePriem(resource, args);
        delete ret[1].refresh;
        return ret;
    });

    const Comp: React.FunctionComponent<{arg: unknown}> = props => {
        usePriemSpy(res, [props.arg]);
        return null;
    };

    const {rerender} = render(<Comp arg="foo" />);
    rerender(<Comp arg="bar" />);
    rerender(<Comp arg="baz" />);

    await waitEffects();

    expect(usePriemSpy).toHaveLastReturnedWith([
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

    expect(usePriemSpy).toHaveLastReturnedWith([
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

    expect(usePriemSpy).toHaveLastReturnedWith([
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

    expect(usePriemSpy).toHaveLastReturnedWith([
        'baz',
        {
            fulfilled: true,
            pending: false,
            reason: null,
            rejected: false,
        },
    ]);
    expect(getSpy).toHaveBeenCalledTimes(3);

    // @ts-ignore
    expect(res.memoized.cache).toMatchInlineSnapshot(`
Cache {
  "head": CacheItem {
    "key": Array [
      "baz",
    ],
    "value": Object {
      "data": "baz",
      "promise": Promise {},
      "reason": null,
      "status": 1,
    },
  },
  "size": 2,
  "tail": CacheItem {
    "key": Array [
      "foo",
    ],
    "value": Object {
      "data": "foo",
      "promise": Promise {},
      "reason": null,
      "status": 1,
    },
  },
}
`);
});
