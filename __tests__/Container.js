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

    expect(ctr._get({})).toMatchInlineSnapshot(`
Object {
  "fulfilled": false,
  "pending": true,
  "reason": null,
  "refreshing": false,
  "rejected": false,
  "value": null,
}
`);
});

it('should default `mapPropsToArgs` to a function that returns an empty array', () => {
    const ctr = new Container({
        promise: () => delay(100),
    });
    expect(ctr._mapPropsToArgs()).toEqual([]);
});
