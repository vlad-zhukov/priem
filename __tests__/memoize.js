import delay from 'delay';
import memoize from '../src/memoize/memoize';

it('should memoize promises', async () => {
    const memoized = memoize(name => delay(500, {value: `Hello ${name}!`}));

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(600);

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);

    expect(memoized('mom')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(600);

    expect(memoized('mom')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello mom!",
}
`);

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 1,
  "value": "Hello world!",
}
`);
});

it('should not throw on rejected promises', async () => {
    const memoized = memoize(name => delay.reject(500, {value: new Error(`Hello ${name}!`)}));

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(600);

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
  "value": null,
}
`);

    expect(memoized('world')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello world!],
  "status": 2,
  "value": null,
}
`);

    expect(memoized('mom')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": null,
  "status": 0,
  "value": null,
}
`);

    await delay(600);

    expect(memoized('mom')).toMatchInlineSnapshot(`
Object {
  "promise": Promise {},
  "reason": [Error: Hello mom!],
  "status": 2,
  "value": null,
}
`);
});
