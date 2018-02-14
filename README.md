# priem · [![npm](https://img.shields.io/npm/v/priem.svg)](https://npm.im/priem)

> A rich asynchronous state management across multiple React components.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Examples](#examples)
- [API](#api)
  - [`PriemProvider`](#priemprovider)
  - [`Priem`](#priem)
  - [`promiseState`](#promiseState)
  - [`propTypes`](#proptypes)

## Install

```bash
yarn add priem
```

## Usage

__Step 1:__ Wrap your component tree with a `PriemProvider`:

```jsx

```

__Step 2:__ Connect components with the `reduxStatus` decorator:

```jsx

```

## Examples

Example apps can be found under the `examples/` directory. They are
ported from the official [Redux repository](https://github.com/reactjs/redux/tree/master/examples),
so you can compare both implementations.

- [Counter](https://github.com/Vlad-Zhukov/priem/tree/master/examples/counter)
- [Async](https://github.com/Vlad-Zhukov/priem/tree/master/examples/async)

## API

### `PriemProvider`

### `Priem`

A component for storing plain data as well as handling async jobs with
promises (such as data fetching). It uses [`moize`](https://github.com/planttheidea/moize)
for caching results of promises.

__Props__

1. `name` _(String)_: A key where the state will be stored under
the `status` reducer. It's an optional property in `options`,
but a required one in general. If it wasn't set here, it must
be set with React props.
2. `[initialValues]` _(Object)_: Values which will be used during
initialization, they can have any shape. Defaults to `{}`.
3. `[asyncValues]` _(Function)_: A function that takes React `props`
and must return an object. Each key of that object refers to a place
in the reducer under which a data will be stored. Each value must be
an object with the following properties.
  - `promise` _(Function)_: A function that takes `args` as
  arguments (if specified) and returns a promise. The result of that
  promise will be memoized and stored in the Redux store.
  - `[args]` _(Array)_: Arguments that will be passed to
  the `promise` function. They must be immutable (booleans, numbers
  and strings) otherwise the meimozation will not work.
  - `[maxAge]` _(Number)_: See [`moize` documentation](https://github.com/planttheidea/moize#advanced-usage).
  - `[maxArgs]` _(Number)_: See [`moize` documentation](https://github.com/planttheidea/moize#advanced-usage).
  - `[maxSize]` _(Number)_: See [`moize` documentation](https://github.com/planttheidea/moize#advanced-usage).
4. `[persist]` _(Boolean)_: If `false`, the state related to that
`name` will be removed when the last component using it unmounts.
Defaults to `true`.
5. `[autoRefresh]` _(Boolean)_: An option that defines should async
functions be called or not, including initial mounting. Setting it
to `false` allows manual refresh handling using the `refresh`
method. Defaults to `true`.
6. `[render]` _(Function)_
7. `[children]` _(React.Component)_

__Passed props__

The following props will be passed down to the wrapped component:

- `priem` _(Object)_: A slice of store.
- `setPriem(updater)` _(Function)_: If the `updater` is a
function, it takes a current `priem` state slice as an argument and must
return an object that will be shallow merged with the current `priem`.
If the `updater` is an object, it will be shallow merged directly.
- `setPriemTo(priemName, updater)` _(Function)_: Similar
to `setPriem()` but also takes in a `priemName` as the first argument.
Useful for setting data to another `priem` slices.
- `refresh()` _(Function)_: Forces the update of async values. Note that
it will call the memoized function.

The following props are the ones that have been used during the
initialization. They are not connected to the store for performance
reasons, but it might be changed in the future if there will be
a strong reason to do that.

- `priemName` _(String)_
- `persist` _(Boolean)_
- `autoRefresh` _(Boolean)_

<!-- __Instance properties__

The following properties are public so they can be called from the
outside.

- `status` _(getter)_
- `setStatus(nextStatus)`
- `setStatusTo(statusName, nextStatus)`
- `refresh()`

An example that utilizes instance methods based on the example above:
```jsx
const Counter = reduxStatus({
    name: 'Counter',
    initialValues: {
        counter: 0,
    },
})(({status}) => <p>{status.counter}</p>);

class CounterController extends PureComponent {
    increment = () => {
        this.counter.setStatus(prevStatus => ({
            counter: prevStatus.counter + 1,
        }));
    }

    decrement = () => {
        this.counter.setStatus(prevStatus => ({
            counter: prevStatus.counter - 1,
        }));
    }

    _getRef = (ref) => {
        this.counter = ref;
    }

    render() {
        return (
            <div>
                <Counter statusRef={this._getRef} />
                <button onClick={this.increment}>Increment</button>
                <button onClick={this.decrement}>Decrement</button>
            </div>
        );
    }
}
```-->

__Async usage__

```jsx
import React, {PureComponent} from 'react';
import {reduxStatus} from 'redux-status';

@reduxStatus({
    name: 'Async', // 'name' is required
    asyncValues: props => ({ // 'values' is required too
        [props.reddit]: {
            args: [props.reddit],
            promise: reddit => fetch(`https://www.reddit.com/r/${reddit}.json`)
                .then(res => res.json())
                .then(res => res.data.children),
        },
    }),
})
class Async extends PureComponent {
    render() {
        const {status, reddit} = this.props;
        const {pending, refreshing, value} = status[reddit];

        if (!value) {
            return pending ? <h2>Loading...</h2> : <h2>Empty.</h2>;
        }

        return (
            <div style={{opacity: pending || refreshing ? 0.5 : 1}}>
                <ul>
                    {posts.map((post, i) => <li key={i}>{post.data.title}</li>)}
                </ul>
            </div>
        );
    }
}
```

---

### `promiseState`

A set of functions that are used internally to represent states of
async values. These are not intended for public usage.

- `pending(): PromiseStates`
- `refreshing(previous?: PromiseState): PromiseState`
- `fulfilled(valueOrPromiseState: any): PromiseState`
- `rejected(reason: any): PromiseState`
- `isPromiseState(maybePromiseState: any): boolean`

---

### `propTypes`

An object with prop types.

- `priem` _(Object)_
- `promiseState` _(Object)_

---
