# priem · [![npm][1]][2] [![Build Status][3]][4] [![codecov][5]][6] [![bundlephobia][7]][8]

> Rich async state management.

**`priem` v2 is currently in beta!**

## Table of Contents

-   [Installation](#installation)
-   [Getting Started](#getting-started)
-   [Examples](#examples)
-   [API](#api)
    -   [`Container`](#container)
    -   [`Priem`](#priem)
    -   [`getDataFromTree`](#getdatafromtreecomponent)
    -   [`populateStore`](#populatestoreinitialstore)
    -   [`flushStore`](#flishstore)

## Installation

```bash
yarn add priem@beta
```

## Getting Started

**App.js**

```jsx
import React from 'react';
import {Priem, Container} from 'priem';

const redditContainer = new Container({
    promise: () =>
        fetch('https://www.reddit.com/r/reactjs.json')
            .then(res => res.json())
            .then(res => res.data.children),
    ssrKey: 'reddit-container',
});

export default () => (
    <Priem sources={{reddit: redditContainer}}>
        {({reddit}, {pending}) => {
            if (!reddit) {
                return pending ? <h2>Loading...</h2> : <h2>Empty.</h2>;
            }

            return (
                <div style={{opacity: pending ? 0.5 : 1}}>
                    <ul>
                        {reddit.map((post, i) => <li key={i}>{post.title}</li>)}
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
import {getDataFromTree, flushStore} from 'priem';
import App from './App';

app.get(async (req, res) => {
    await getDataFromTree(<App />);
    const content = ReactDOM.renderToString(<App />);

    // We suggest to use a specific library instead of JSON.stringify
    // for example `devalue` or `serialize-javascript`.
    const storeJson = JSON.stringify(flushStore()).replace(/</g, '\\u003c');

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
import {populateStore} from 'priem';

populateStore(JSON.parse(window.__PRIEM_STORE__));
delete window.__PRIEM_STORE__;

// Note that the import order is important here
const App = require('./App').default;

ReactDOM.hydrate(<App />, document.getElementById('root'));
```

## Examples

Example apps can be found under the `examples/` directory.

-   [Reddit](https://github.com/Vlad-Zhukov/priem/tree/master/examples/reddit)
-   [SSR](https://github.com/Vlad-Zhukov/priem/tree/master/examples/ssr)
-   [Suggestions](https://github.com/Vlad-Zhukov/priem/tree/master/examples/suggestions)

## API

### `Container`

A container for fetching and caching data. `Priem` components can subscribe to it.

**Constructor arguments:**

1.  `options` _(Object)_: An options object, that can have the following properties:
    -   `promise` _(AsyncFunction)_: An async function that takes arguments created by `mapPropsToArgs` and must return
        a Promise. If promise rejects, the cache item corresponding to these arguments will have a rejected status.
    -   `[mapPropsToArgs]` _(Function)_: A function that takes React props and must return an array of **immutable**
        values that will be passed to the `promise` function as arguments. Returning `null` from this function will
        prevent the update which can be utilized for waiting for async tasks or user interactions to finish. Defaults to
        `() => []`.
    -   `[maxAge]` _(Number)_: A time in milliseconds after which cache items will expire and trigger a refresh.
    -   `[maxSize]` _(Number)_: A number of maximum cache entries to store. After exceeding this amount the most former
        used item will be removed and a refresh triggered.
    -   `[ssrKey]` _(String)_: A unique key that will be used to place this container to the store. Required for
        server-side rendering.

### `Priem`

A component for subscribing to containers.

**Props**

1.  `sources` _(Object)_: An object of containers to subscribe to.
2.  `[children]` _(Function)_: One of two ways to render components. Must be a function that takes
    [props](#passed-props) and returns React component(s).

**Passed props**

The following props will be passed down:

1. `props` _(Object)_: An object with all additional properties for `Priem` component and all values from subscribed
   containers.
2. `priemBag` _(Object)_: An object that aggregates a state of all subscribed containers.
    - `pending` _(Boolean)_: `true` if _any_ container is pending.
    - `fulfilled` _(Boolean)_: `true` if _all_ containers have been fulfilled.
    - `rejected` _(Boolean)_: `true` if _any_ container has been rejected.
    - `reason` _(Error|null)_: if _any_ container has been rejected, a error will be provided here. If more than one
      container has been rejected, only the first error will be stored.
    - `refresh` _(Function)_: a method to refresh all containers.

---

### `getDataFromTree(element)`

An async function that walks the component tree and fetches async values. Returns a promise that either resolves with
`undefined` or rejects on errors.

---

### `populateStore(initialStore)`

A function to populate internal store with initial data from server.

---

### `flushStore()`

A function that clears internal store and returns it. It's safe to serialize it and send to client.

---

[1]: https://img.shields.io/npm/v/priem.svg
[2]: https://npm.im/priem
[3]: https://travis-ci.com/vlad-zhukov/priem.svg?branch=master
[4]: https://travis-ci.com/vlad-zhukov/priem
[5]: https://codecov.io/gh/vlad-zhukov/priem/branch/master/graph/badge.svg
[6]: https://codecov.io/gh/vlad-zhukov/priem
[7]: https://img.shields.io/bundlephobia/minzip/priem.svg
[8]: https://bundlephobia.com/result?p=priem
