# priem · [![npm][1]][2] [![Build Status][3]][4] [![codecov][5]][6] [![bundlephobia][7]][8]

> Rich (a)sync state management.

## Table of Contents

-   [Installation](#installation)
-   [Getting Started](#getting-started)
    -   [Sync usage](#sync-usage)
    -   [Server-side rendering](#server-side-rendering)
    -   [`withPriem` HOC](#withpriem-hoc)
-   [Examples](#examples)
-   [API](#api)
    -   [`createStore`](#createstoreinitialstore)
    -   [`Priem`](#priem)
    -   [`withPriem`](#withpriemprops)
    -   [`getDataFromTree`](#getdatafromtreecomponent)
    -   [`promiseState`](#promisestate)

## Installation

```bash
yarn add priem
```

## Getting Started

### Sync usage

```jsx
import React from 'react';
import {Priem, createStore} from 'priem';

const {Container} = createStore();

class CounterContainer extends Continer {
    increment = () => {
        this.setState({value: this.state.value + 1});
    };

    decrement = () => {
        this.setState({value: this.state.value - 1});
    };
}

const counterContainer = new CounterContainer({value: 1});

export default () => (
    <Priem sources={{counter: counterContainer}}>
        {({counter}) => (
            <div>
                <p>{counter.value}</p>
                <button onClick={counterContainer.increment}>Increment</button>
                <button onClick={counterContainer.decrement}>Decrement</button>
            </div>
        )}
    </Priem>
);
```

### Server-side rendering

**store.js**

```jsx
import {createStore} from 'priem';

let initialStore = {};

if (isBrowser) {
    initialStore = JSON.parse(window.__PRIEM_STORE__);
    delete window.__PRIEM_STORE__;
}

const {AsyncContainer, getStore} = createStore(initialStore);

const redditContainer = new AsyncContainer({
    promise: () =>
        fetch('https://www.reddit.com/r/reactjs.json')
            .then(res => res.json())
            .then(res => res.data.children),
    ssrKey: 'redditContainer', // this is required for SSR to work
});

export {redditContainer, getStore};
```

**App.js**

```jsx
import React from 'react';
import {Priem} from 'priem';
import {redditContainer} from './store';

export default () => (
    <Priem sources={{reddit: redditContainer}}>
        {({reddit}) => {
            const {pending, refreshing, value} = reddit;

            if (!value) {
                return pending ? <h2>Loading...</h2> : <h2>Empty.</h2>;
            }

            return (
                <div style={{opacity: pending || refreshing ? 0.5 : 1}}>
                    <ul>
                        {value.map((post, i) => <li key={i}>{post.data.title}</li>)}
                    </ul>
                </div>
            );
        })}
    </Priem>
);
```

**server.js**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/server';
import {getDataFromTree} from 'priem';
import {getStore} from './store';
import App from './App';

app.get(async (req, res) => {
    await getDataFromTree(<App />);
    const content = ReactDOM.renderToString(<App />);

    // We suggest to use a specific library instead of JSON.stringify
    // for example `devalue` or `serialize-javascript`.
    const storeJson = JSON.stringify(getStore()).replace(/</g, '\\u003c');

    res.send(`
        <!doctype html>
        ${ReactDOM.renderToStaticMarkup(<Html content={content} />)}
        <script id="preloaded-state">
            window.__PRIEM_STORE__ = ${storeJson};
        </script>
    `);
});
```

**client.js**

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.hydrate(<App />, document.getElementById('root'));
```

### `withPriem` HOC

The above async example can be rewritten using the [`withPriem`](#withpriem) higher-order component:

```jsx
import React from 'react';
import {withPriem} from 'priem';
import {redditContainer} from './store';

@withPriem({sources: {reddit: redditContainer}})
class RedditPosts extends React.Component {
    render() {
        const {pending, refreshing, value} = this.props.reddit;

        if (!value) {
            return pending ? <h2>Loading...</h2> : <h2>Empty.</h2>;
        }

        return (
            <div style={{opacity: pending || refreshing ? 0.5 : 1}}>
                <ul>{value.map((post, i) => <li key={i}>{post.data.title}</li>)}</ul>
            </div>
        );
    }
}

export default RedditPosts;
```

## Examples

Example apps can be found under the `examples/` directory. They are ported from the official
[Redux repository](https://github.com/reactjs/redux/tree/master/examples), so you can compare both implementations.

-   [Counter](https://github.com/Vlad-Zhukov/priem/tree/master/examples/counter)
-   [Async](https://github.com/Vlad-Zhukov/priem/tree/master/examples/async)

## API

### `createStore([initialStore])`

A function that creates a new store. Optionally takes a single argument `initialStore` that must be a server-side
rendered store. Return an object with the following properties:

#### `Container`

A base class that should be used to create sync containers. It's also a good idea to extend it with custom functions.

**Arguments:**

1.  `[initialState]` _(Object)_: A state object this container will be created with.
2.  `[options]` _(Object)_: An options object, that can have the following properties:
    -   `[persist]` _(Boolean)_: When `false`, this container's state will be set to its initial value when all `Priem`
        components unsubscribe from this container. Defaults to `true`.
    -   `[ssrKey]` _(String)_: A unique key that will be used to place this container to the store. Required for
        server-side rendering.

Similarly to React instances, containers have a `state` property and a `setState` method. However unlike in React, the
state changes are _synchronous_.

#### `AsyncContainer`

A class that extends the `Container` class. It was designed to efficiently handle async jobs and never trigger unwanted
updates of subscribed React components. It also caches results of promises using
[`moize`](https://github.com/planttheidea/moize).

**Arguments:**

1.  `options` _(Object)_: An object that inherits all options from the base `Container` and also allows to set the
    following:
    -   `promise` _(AsyncFunction)_: An async function that takes arguments created by `mapPropsToArgs` and returns a
        Promise. During resolving the state of this container updates with [`promiseState`s](#promisestate).
    -   `[mapPropsToArgs]` _(Function)_: A function that takes React props and must return an array of values that will
        be passed to the `promise` function as arguments. During caching args are compared using a shallow equality
        algorithm, so to avoid unnecessary rerenders make sure you use either immutable values (such as numbers and
        strings) or pass the same exactily same objects. Returning `null` from this function will prevent the update
        which can be utilized for waiting for async tasks or user interactions to finish. Defaults to `() => []`.
    -   `[autoRefresh]` _(Boolean)_: A property that defines if this container resolve the `promise` on initial mounting
        and when props change. Setting it to `false` makes it only possible to refresh using the `refresh` method from
        the [`Priem`](#priem) component. Defaults to `true`.
    -   `[maxAge]` _(Number)_: See [`moize` documentation](https://github.com/planttheidea/moize#advanced-usage).
    -   `[maxArgs]` _(Number)_: See [`moize` documentation](https://github.com/planttheidea/moize#advanced-usage).
    -   `[maxSize]` _(Number)_: See [`moize` documentation](https://github.com/planttheidea/moize#advanced-usage).

#### `getStore`

A function that return a serializable store from all containers that have a `ssrKey` property. Handy for sending
server-side rendered store to the client.

### `Priem`

A component for subscribing to containers.

**Props**

1.  `sources` _(Object)_: An object of containers to subscribe to.
2.  `[children]` _(Function)_: One of two ways to render components. Must be a function that takes
    [props](#passed-props) and returns React component(s).
3.  `[component]` _(React.Element)_: A React element that can be rendered using `React.createElement` with
    [props](#passed-props).

**Passed props**

The following props will be passed down:

-   Container stores that will match keys specified in the `sources` prop.
-   `refresh()` _(Function)_: Forces the update of async values.

---

### `withPriem(props)`

A simple decorator to create a [`Priem`](#priem) instance. It the same as `Priem` with a single exception that
'component' and 'children' props are not supported, use decorator syntax instead.

---

### `getDataFromTree(component)`

An async function that walks the component tree and fetches async values. Returns a promise that either resolves with
`undefined` or rejects on errors.

---

### `promiseState`

Helper functions for promise states.

-   `isPromiseState(maybePromiseState: any): boolean`
-   `isLoading(promiseState: PromiseState): boolean`

---

[1]: https://img.shields.io/npm/v/priem.svg
[2]: https://npm.im/priem
[3]: https://travis-ci.com/vlad-zhukov/priem.svg?branch=master
[4]: https://travis-ci.com/vlad-zhukov/priem
[5]: https://codecov.io/gh/vlad-zhukov/priem/branch/master/graph/badge.svg
[6]: https://codecov.io/gh/vlad-zhukov/priem
[7]: https://img.shields.io/bundlephobia/minzip/priem.svg
[8]: https://bundlephobia.com/result?p=priem
