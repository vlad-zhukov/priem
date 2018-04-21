import {promiseState} from '../src/index';

const {empty, pending, refreshing, fulfilled, rejected, isPromiseState} = promiseState;

it('should create an empty promise state', () => {
    expect(empty()).toMatchSnapshot();
});

it('should create a pending promise state', () => {
    expect(pending()).toMatchSnapshot();
});

it('should create a refreshing promise state', () => {
    expect(refreshing()).toMatchSnapshot();

    const foo = fulfilled('foo');
    expect(refreshing(foo)).toMatchSnapshot();
});

it('should create a fulfilled promise state', () => {
    expect(fulfilled()).toMatchSnapshot();

    const foo = fulfilled('foo');
    expect(foo).toMatchSnapshot();
    expect(fulfilled(foo)).toMatchSnapshot();
});

it('should create a rejected promise state', () => {
    expect(rejected()).toMatchSnapshot();
    expect(rejected('Test Error!')).toMatchSnapshot();
    expect(rejected(new Error('Test Error!'))).toMatchSnapshot();
});

it('should check if a value is a promise state', () => {
    expect(isPromiseState()).toBe(false);
    expect(isPromiseState(null)).toBe(false);
    expect(isPromiseState('foo')).toBe(false);
    expect(isPromiseState({pending: true})).toBe(false);

    expect(isPromiseState(pending())).toBe(true);
    expect(isPromiseState(refreshing())).toBe(true);
    expect(isPromiseState(fulfilled())).toBe(true);
    expect(isPromiseState(rejected())).toBe(true);
});
