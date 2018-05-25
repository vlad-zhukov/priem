import * as promiseState from '../src/promiseState';

const {pending, refreshing, fulfilled, rejected, isPromiseState, isLoading} = promiseState;

it('pending()', () => {
    expect(pending()).toMatchSnapshot();
});

it('refreshing()', () => {
    expect(refreshing()).toMatchSnapshot();

    const foo = fulfilled('foo');
    expect(refreshing(foo)).toMatchSnapshot();
});

it('fulfilled()', () => {
    expect(fulfilled()).toMatchSnapshot();

    const foo = fulfilled('foo');
    expect(foo).toMatchSnapshot();
    expect(fulfilled(foo)).toMatchSnapshot();
});

it('rejected()', () => {
    expect(rejected()).toMatchSnapshot();
    expect(rejected('Test Error!')).toMatchSnapshot();
    expect(rejected(new Error('Test Error!'))).toMatchSnapshot();
});

it('isPromiseState()', () => {
    expect(isPromiseState()).toBe(false);
    expect(isPromiseState(null)).toBe(false);
    expect(isPromiseState('foo')).toBe(false);
    expect(isPromiseState({pending: true})).toBe(false);

    expect(isPromiseState(pending())).toBe(true);
    expect(isPromiseState(refreshing())).toBe(true);
    expect(isPromiseState(fulfilled())).toBe(true);
    expect(isPromiseState(rejected())).toBe(true);
});

it('isLoading()', () => {
    expect(isLoading(fulfilled())).toBe(false);
    expect(isLoading(rejected())).toBe(false);

    expect(isLoading(pending())).toBe(true);
    expect(isLoading(refreshing())).toBe(true);

    expect(() => isLoading()).toThrow(TypeError);
    expect(() => isLoading(null)).toThrow(TypeError);
    expect(() => isLoading('foo')).toThrow(TypeError);
    expect(() => isLoading({pending: true})).toThrow(TypeError);
});
