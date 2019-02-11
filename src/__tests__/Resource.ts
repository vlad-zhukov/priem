/**
 * @jest-environment node
 */

import delay from 'delay';
import {Resource} from '../Resource';
import {populateStore, flushStore} from '../index';

afterEach(() => {
    flushStore();
});

it('should populate store', () => {
    populateStore([['unique-key', []]]);

    expect(flushStore()).toEqual([['unique-key', []]]);
    expect(flushStore()).toEqual([]);
});

it('should return `null` if `args` have not been provided', () => {
    const res = new Resource(() => delay(100), {
        ssrKey: 'unique-key',
    });

    expect(res.has(null)).toBe(false);
    expect(res.get(null)).toBe(null);
});

it('should not automatically populate store in browser environments', () => {
    const res = new Resource(value => delay(100, {value}), {
        ssrKey: 'unique-key',
    });

    expect(res.get(['foo'])).toMatchInlineSnapshot(`
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

it('should throw when there is a store entry with such `ssrKey` already exists', async () => {
    const res1 = new Resource(value => delay(100, {value}), {
        ssrKey: 'unique-key',
    });
    const res2 = new Resource(value => delay(100, {value}), {
        ssrKey: 'unique-key',
    });

    res1.get(['foo']);
    expect(res1.has(['foo'])).toBe(true);
    await delay(150);

    expect(() => res2.get(['bar'])).toThrowErrorMatchingInlineSnapshot(
        `"usePriem: A resource with 'unique-key' \`ssrKey\` already exists. Please make sure \`ssrKey\`s are unique."`
    );
});
