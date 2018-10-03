import delay from 'delay';
import {Container, populateStore, flushStore} from '../src/Container';

it('should populate store', () => {
    populateStore({'some-key': []});

    expect(flushStore()).toEqual({'some-key': []});
    expect(flushStore()).toEqual({});
});

it('should return a pending state if `args` have not been provided', () => {
    const ctr = new Container({
        mapPropsToArgs: () => null,
        promise: () => delay(100),
    });

    expect(ctr._get({})).toBe(null);
});

it('should default `mapPropsToArgs` to a function that returns an empty array', () => {
    const ctr = new Container({
        promise: () => delay(100),
    });
    expect(ctr._mapPropsToArgs()).toEqual([]);
});

it('should not automatically populate store in browser environments', () => {
    const ctr = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
    });

    expect(ctr._get({})).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": null,
  "status": 0,
}
`);
    expect(flushStore()).toMatchInlineSnapshot(`Object {}`);
});

it('should guard against passing reference types to `promise` function', () => {
    const ctr = new Container({
        mapPropsToArgs: () => [{}],
        promise: value => delay(100, {value}),
    });

    expect(() => ctr._get({})).toThrowErrorMatchingInlineSnapshot(
        `"Priem: Passing reference types (such as objects and arrays) to \`promise\` function is discouraged as it's very error prone and often causes infinite rerenders. Please change this function signature to only use primitive types."`
    );
});
