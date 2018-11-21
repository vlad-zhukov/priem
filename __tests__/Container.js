/**
 * @jest-environment node
 */

import delay from 'delay';
import {Container, populateStore, flushStore} from '../src/Container';

afterEach(() => {
    flushStore();
});

it('should populate store', () => {
    populateStore([['unique-key', []]]);

    expect(flushStore()).toEqual([['unique-key', []]]);
    expect(flushStore()).toEqual([]);
});

it('should return a pending state if `args` have not been provided', () => {
    const ctr = new Container({
        promise: () => delay(100),
        ssrKey: 'unique-key',
    });

    expect(ctr._get(null)).toBe(null);
});

it('should not automatically populate store in browser environments', () => {
    const ctr = new Container({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key',
    });

    expect(ctr._get(['foo'])).toMatchInlineSnapshot(`
Object {
  "data": null,
  "promise": Promise {},
  "reason": null,
  "status": 0,
}
`);
    expect(flushStore()).toMatchInlineSnapshot(`
Array [
  Array [
    "unique-key",
    Array [],
  ],
]
`);
});

it('should guard against passing reference types to `promise` function', () => {
    const ctr = new Container({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key',
    });

    expect(() => ctr._get([{}])).toThrowErrorMatchingInlineSnapshot(
        `"usePriem: Passing reference types (such as objects and arrays) to \`promise\` function is discouraged as it's very error prone and often causes infinite rerenders. Please change this function signature to only use primitive types."`
    );
});

it('should throw when there is a store entry with such `ssrKey` already exists', async () => {
    const ctr1 = new Container({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key',
    });
    const ctr2 = new Container({
        promise: value => delay(100, {value}),
        ssrKey: 'unique-key',
    });

    ctr1._get(['foo']);
    await delay(150);

    expect(() => ctr2._get(['bar'])).toThrowErrorMatchingInlineSnapshot(
        `"usePriem: A container with 'unique-key' \`ssrKey\` already exists. Please make sure \`ssrKey\`s are unique."`
    );
});
