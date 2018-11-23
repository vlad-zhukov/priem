/* eslint-disable import/no-extraneous-dependencies, react/no-multi-comp */

import React from 'react';
import delay from 'delay';
import {render, cleanup, flushEffects, fireEvent} from 'react-testing-library';
import usePriemOriginal from '../src/usePriem';
import {Resource} from '../src/Resource';

/* eslint-disable react/no-unused-state */
class ErrorBoundary extends React.Component {
    constructor() {
        super();
        this.state = {initTime: Date.now(), hasError: null};
    }

    componentDidCatch(error) {
        this.setState({hasError: error, catchTime: Date.now()});
    }

    render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}
/* eslint-enable react/no-unused-state */

const usePriem = jest.fn(usePriemOriginal);
const getSpy = jest.spyOn(Resource.prototype, '_get');
const onCacheChangeSpy = jest.spyOn(Resource.prototype, '_onCacheChange');

afterEach(() => {
    usePriem.mockClear();
    getSpy.mockClear();
    onCacheChangeSpy.mockClear();
    cleanup();
});

it('should throw if `source` is not a `Resource` instance', async () => {
    function Comp() {
        usePriem({}, []);
        return null;
    }

    const ref = React.createRef();
    const element = (
        <ErrorBoundary ref={ref}>
            <Comp />
        </ErrorBoundary>
    );

    render(element);
    flushEffects();

    await delay(500);

    expect(ref.current.state.hasError).toMatchInlineSnapshot(
        `[TypeError: usePriem: 'source' must be an instance of 'Resource'.]`
    );
});

it('should throw if `source` is different after initializing', async () => {
    const res1 = new Resource({
        promise: () => delay(100),
    });
    const res2 = new Resource({
        promise: () => delay(100),
    });

    function Comp() {
        const [dummy, setDummy] = React.useState(true);
        usePriem(dummy ? res1 : res2, []);
        setDummy(false);
        return null;
    }

    const ref = React.createRef();
    const element = (
        <ErrorBoundary ref={ref}>
            <Comp />
        </ErrorBoundary>
    );

    render(element);
    flushEffects();

    await delay(500);

    expect(ref.current.state.hasError).toMatchInlineSnapshot(
        `[TypeError: usePriem: it looks like you've passed a different 'source' value after initializing.]`
    );
});

it('should rerun promises when cache expires if `maxAge` is set', async () => {
    /**
     * ASYNC UPDATE FLOW.
     * Numbers mean the order of function calls.
     *
     *                   | usePriem#render | Resource#_onCacheChange | Resource#_get
     * ------------------|-----------------|-------------------------|---------------
     *  mount (pending)  | 1               |                         | 2
     *  fulfilled        | 4               | 3                       | 5
     *  props (pending)  | 6               |                         | 7
     *  fulfilled        | 9               | 8                       | 10
     *  expire (pending) | 12              | 11                      | 13
     *  fulfilled        | 15              | 14                      | 16
     */

    const res = new Resource({
        promise: value => delay(200, {value}),
        maxAge: 1000,
    });

    function Comp({count}) {
        const {data} = usePriem(res, [`foo${count}`]);
        return <div>{data}</div>;
    }

    const {container, rerender} = render(<Comp count="1" />);
    flushEffects();

    // mount (pending)

    expect(container.innerHTML).toBe('<div></div>');
    expect(usePriem).toHaveBeenCalledTimes(1);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);

    await delay(300);

    // fulfilled

    expect(container.innerHTML).toBe('<div>foo1</div>');
    expect(usePriem).toHaveBeenCalledTimes(2);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(2);

    rerender(<Comp count="2" />);

    // change props (pending)

    expect(container.innerHTML).toBe('<div></div>');
    expect(usePriem).toHaveBeenCalledTimes(3);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(3);

    await delay(200);

    // fulfilled

    expect(container.innerHTML).toBe('<div>foo2</div>');
    expect(usePriem).toHaveBeenCalledTimes(4);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(4);

    await delay(800);

    // expire (pending)

    expect(container.innerHTML).toBe('<div>foo2</div>');
    expect(usePriem).toHaveBeenCalledTimes(5);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(3);
    expect(getSpy).toHaveBeenCalledTimes(5);

    await delay(210);

    // fulfilled

    expect(container.innerHTML).toBe('<div>foo2</div>');
    expect(usePriem).toHaveBeenCalledTimes(6);
    expect(onCacheChangeSpy).toHaveBeenCalledTimes(4);
    expect(getSpy).toHaveBeenCalledTimes(6);
});

it('should return a promise state with a `refresh` method', async () => {
    let shouldReject = false;
    const res = new Resource({
        promise(value) {
            if (shouldReject) {
                return delay.reject(10, {value: new Error('error!')});
            }
            shouldReject = true;
            return delay(100, {value});
        },
        maxSize: 10,
    });

    function Comp() {
        const {data, reason, refresh} = usePriem(res, ['foo']);
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
    flushEffects();

    expect(container.innerHTML).toBe('<button type="button"></button>');
    expect(usePriem).toHaveBeenCalledTimes(1);

    await delay(200);

    expect(container.innerHTML).toBe('<button type="button">foo</button>');
    expect(usePriem).toHaveBeenCalledTimes(2);

    fireEvent.click(container.querySelector('button'));
    expect(container.innerHTML).toBe('<button type="button">foo</button>');
    expect(usePriem).toHaveBeenCalledTimes(3);

    await delay(200);

    expect(container.innerHTML).toBe('<button type="button"></button><p>error!</p>');
    expect(usePriem).toHaveBeenCalledTimes(4);

    await delay(500);

    expect(container.innerHTML).toBe('<button type="button"></button><p>error!</p>');
    expect(usePriem).toHaveBeenCalledTimes(4);
});

it('should render a nested component', async () => {
    const res1 = new Resource({
        promise: value => delay(100, {value}),
    });
    const res2 = new Resource({
        promise: (res1Value, value) => delay(100, {value: res1Value + value}),
    });

    function Comp() {
        const {data: data1} = usePriem(res1, ['foo']);
        const {data: data2} = usePriem(res2, !data1 ? null : [data1, 'bar']);
        return <div>{data2}</div>;
    }

    const {container} = render(<Comp />);
    flushEffects();

    await delay(300);

    expect(container.innerHTML).toBe('<div>foobar</div>');
});

it('should render `usePriem` hooks that are subscribed to the same resource but need different data', async () => {
    const res = new Resource({
        promise: value => delay(100, {value}),
        maxSize: 2,
    });

    function Comp() {
        const {data: data1} = usePriem(res, ['foo']);
        const {data: data2} = usePriem(res, ['bar']);
        return (
            <div>
                <div>{data1}</div>
                <div>{data2}</div>
            </div>
        );
    }

    const {container} = render(<Comp />);
    flushEffects();
    await delay(300);

    expect(container.innerHTML).toBe('<div><div>foo</div><div>bar</div></div>');
});
