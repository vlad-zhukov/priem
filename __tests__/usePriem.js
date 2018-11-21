/* eslint-disable import/no-extraneous-dependencies, react/no-multi-comp */

import React from 'react';
import delay from 'delay';
import {render, cleanup, flushEffects, fireEvent} from 'react-testing-library';
import usePriemOriginal from '../src/usePriem';
import {Container} from '../src/Container';

/* eslint-disable react/no-unused-state */
export class ErrorBoundary extends React.Component {
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
const getSpy = jest.spyOn(Container.prototype, '_get');
const onCacheChangeSpy = jest.spyOn(Container.prototype, '_onCacheChange');

afterEach(() => {
    usePriem.mockClear();
    getSpy.mockClear();
    onCacheChangeSpy.mockClear();
    cleanup();
});

it('should throw if `source` is not a `Container` instance', async () => {
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
        `[TypeError: usePriem: 'source' must be an instance of 'Container'.]`
    );
});

it('should throw if `source` is different after initializing', async () => {
    const ctr1 = new Container({
        promise: () => delay(100),
    });
    const ctr2 = new Container({
        promise: () => delay(100),
    });

    function Comp() {
        const [dummy, setDummy] = React.useState(true);
        usePriem(dummy ? ctr1 : ctr2, []);
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
     *                     | usePriem#render | Container#_onCacheChange | Container#_get
     * --------------------|-----------------|--------------------------|------------------
     *  mount (pending)    | 1               |                          | 2
     *  fulfilled          | 4               | 3                        | 5
     *  props (pending)    | 6               |                          | 7
     *  fulfilled          | 9               | 8                        | 10
     *  expire (pending)   | 12              | 11                       | 13
     *  fulfilled          | 15              | 14                       | 16
     */

    const ctr = new Container({
        promise: value => delay(200, {value}),
        maxAge: 1000,
    });

    function Comp({count}) {
        const res = usePriem(ctr, [`foo${count}`]);
        return <div>{res.data}</div>;
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
    const ctr = new Container({
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
        const {data, reason, refresh} = usePriem(ctr, ['foo']);
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
    const ctr1 = new Container({
        promise: value => delay(100, {value}),
    });
    const ctr2 = new Container({
        promise: (ctr1Value, value) => delay(100, {value: ctr1Value + value}),
    });

    function Comp() {
        const res1 = usePriem(ctr1, ['foo']);
        const res2 = usePriem(ctr2, !res1.data ? null : [res1.data, 'bar']);
        return <div>{res2.data}</div>;
    }

    const {container} = render(<Comp />);
    flushEffects();

    await delay(300);

    expect(container.innerHTML).toBe('<div>foobar</div>');
});

it('should render `usePriem` hooks that are subscribed to the same container but need different data', async () => {
    const ctr = new Container({
        promise: value => delay(100, {value}),
        maxSize: 2,
    });

    function Comp() {
        const res1 = usePriem(ctr, ['foo']);
        const res2 = usePriem(ctr, ['bar']);
        return (
            <div>
                <div>{res1.data}</div>
                <div>{res2.data}</div>
            </div>
        );
    }

    const {container} = render(<Comp />);
    flushEffects();
    await delay(300);

    expect(container.innerHTML).toBe('<div><div>foo</div><div>bar</div></div>');
});
