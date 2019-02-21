# priem · [![npm][1]][2] [![Build Status][3]][4] [![codecov][5]][6] [![bundlephobia][7]][8]

A React Hook to decoratively "subscribe" to data with automatic refreshes on argument changes.

## Table of Contents

-   [Installation](#installation)
-   [Getting Started](#getting-started)
-   [Examples](#examples)
-   [API](#api)
    -   [`Resource`](#resource)
    -   [`usePriem`](#usepriem)
    -   [`getDataFromTree`](#getdatafromtreecomponent)
    -   [`populateStore`](#populatestoreinitialstore)
    -   [`flushStore`](#flishstore)

## Installation

```bash
yarn add priem
```

## Getting Started

**App.js**

```jsx
import React from 'react';
import {createResource} from 'priem';

const useReddit = createResource(
    () =>
        fetch('https://www.reddit.com/r/reactjs.json')
            .then(res => res.json())
            .then(res => res.data.children),
    {
        ssrKey: 'reddit-resource',
    }
);

export default () => {
    const [redditData, {pending}] = useReddit();

    if (!redditData) {
        return pending ? <h2>Loading...</h2> : <h2>Empty.</h2>;
    }

    return (
        <div style={{opacity: pending ? 0.5 : 1}}>
            <ul>
                {redditData.map((post, i) => (
                    <li key={i}>{post.title}</li>
                ))}
            </ul>
        </div>
    );
};
```

**server.js**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/server';
import {getDataFromTree} from 'priem/server';
import {flushStore} from 'priem';
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

### `createResource`

Creates a React Hook that fetches and caches data.

**Arguments**

1.  `fn`: _(AsyncFunction)_: An async function that takes arguments from `usePriem` and must return a Promise. If
    promise rejects, the cache item corresponding to these arguments will have a rejected status.
2.  `options` _(Object)_: An options object, that can have the following properties:
    -   `[maxAge]` _(Number)_: A time in milliseconds after which cache items will expire and trigger a refresh.
    -   `[maxSize]` _(Number)_: A number of maximum cache entries to store. After exceeding this amount the most former
        used item will be removed and a refresh triggered. Defaults to 1.
    -   `[ssrKey]` _(String)_: A unique key that will be used to place this resource to the store. Required for
        server-side rendering.

**Returns**

`useResource`.

### `useResource`

A React Hook for subscribing to resources.

**Arguments**

1.  `[args]` _(Array|null)_: An array of arguments that will be passed to a function in `createResource`. Can also be
    `null` which will prevent the update which can be utilized for waiting for other async tasks or user interactions to
    finish. Defaults to `[]`.

**Returns**

The function returns a tuple with data and a meta object:

1.  `data` _(any)_: The data `promise` resolved with. Defaults to `null`.
2.  `meta` _(Object)_: Meta properties of the most **recent** promise.
    -   `pending` _(Boolean)_.
    -   `rejected` _(Boolean)_.
    -   `reason` _(Error|null)_.
    -   `refresh` _(Function)_: a method to update the resource.

---

### `getDataFromTree(element)`

An async function that walks the component tree and fetches data from resources that have `ssrKey` set. Returns a
promise that either resolves with `undefined` or rejects on errors.

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
