# priem · [![npm](https://img.shields.io/npm/v/priem.svg)](https://npm.im/priem) [![Build Status](https://travis-ci.org/vlad-zhukov/priem.svg?branch=master)](https://travis-ci.org/vlad-zhukov/priem)

> Rich (a)sync state management across multiple React components

## Table of Contents

- [Install](#install)
- [Getting Started](#gettingstarted)
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

## Getting Started

__Step 1:__ Wrap your component tree with the `PriemProvider`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import {PriemProvider} from 'priem';
import App from './App';

ReactDOM.render(
    <PriemProvider>
        <App />
    </PriemProvider>,
    document.getElementById('root')
);
```

__Step 2:__ Connect components with the `Priem` component:

```jsx
import React from 'react';
import {Priem} from 'priem';

export default () => (
    <Priem
        name="Counter"
        initialValues={{couter: 0}}
        render={({priem, setPriem}) => {
            const increment = () => setPriem(state => ({
                counter: state.counter + 1,
            }));

            const decrement = () => setPriem(state => ({
                counter: state.counter - 1,
            }))

            return (
                <div>
                    <p>{priem.counter}</p>
                    <button onClick={increment}>Increment</button>
                    <button onClick={decrement}>Decrement</button>
                </div>
            );
        }}
    />
);
```

## Examples

Example apps can be found under the `examples/` directory. They are
ported from the official [Redux repository](https://github.com/reactjs/redux/tree/master/examples),
so you can compare both implementations.

- [Counter](https://github.com/Vlad-Zhukov/priem/tree/master/examples/counter)
- [Async](https://github.com/Vlad-Zhukov/priem/tree/master/examples/async)

__Async usage__

```jsx
import React from 'react';
import {Priem} from 'priem';

export default () => (
    <Priem
        name="Async" // 'name' is required
        asyncValues={props => ({
          [props.reddit]: {
              args: [props.reddit],
              promise: reddit => fetch(`https://www.reddit.com/r/${reddit}.json`)
                  .then(res => res.json())
                  .then(res => res.data.children),
          },
        })}
        render=(({priem, reddit}) => {
            const {pending, refreshing, value} = priem[reddit];

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
        })
    />
);
```

__Server-side rendering__

Server:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/server';
import {getDataFromTree} from 'priem';
import App from './App';

app.get(async (req, res) => {
    const store = await getDataFromTree(<App />);
    const content = ReactDOM.renderToString(<App initialStore={store} />);

    // We suggest to use a specific library instead of JSON.stringify
    // for example `devalue` or `serialize-javascript`.
    const storeJson = JSON.stringify(storeManager.store.getState()).replace(/</g, '\\u003c');

    res.send(`
        <!doctype html>
        ${ReactDOM.renderToStaticMarkup(<Html content={content} />)}
        <script id="preloaded-state">
            window.__PRIEM_STORE__ = ${storeJson};
        </script>
    `);
});
```

Client:
```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const store = JSON.parse(window.__PRIEM_STORE__);
delete window.__PRIEM_STORE__;

ReactDOM.hydrate(
    <App initialStore={store} />,
    document.getElementById('root')
);
```

## API

### `PriemProvider`

A component that provides context for [`Priem`](#priem) component.

__Props__

1. `[initialStore]` _(Object)_: A server rendered store. See
SSR example on how to use it.

### `Priem`

A component for storing plain data as well as handling async jobs with
promises (such as data fetching). It uses [`moize`](https://github.com/planttheidea/moize)
for caching results of promises.

__Props__

1. `name` _(String)_: A key under which the state will be stored.
2. `[initialValues]` _(Object)_: Values which will be used during
initialization, they can have any shape. Defaults to `{}`.
3. `[asyncValues]` _(Function)_: A function that takes `props` and must
return an object. Each key of that object refers to a place
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
6. `[render]` _(Function)_: One of three ways to render components.
Must be a function that takes [props](#passed-props) and returns
React component(s).
7. `[component]` _(React.Element)_: A React element that can be
rendered using `React.createElement` with [props](#passed-props).
8. `[children]` _(React.Component)_: A React component or an array of
components, all of which will be rendered with [props](#passed-props).

__Passed props__

The following props will be passed down to the wrapped component:

- `priem` _(Object)_: A slice of store.
- `setPriem(updater)` _(Function)_: If the `updater` is a
function, it takes a current `priem` state slice as an argument and must
return an object that will be shallow merged with the current `priem`.
If the `updater` is an object, it will be shallow merged directly.
- `setPriemTo(priemName, updater)` _(Function)_: Similar
to `setPriem()` but also takes a `priemName` as the first argument.
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

---

### `promiseState`

A set of functions that are used internally to represent states of
async values. Most of these are not intended for public usage.

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
