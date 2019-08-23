import React from 'react';
import {hydrate} from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import {hydrateStore} from 'priem';

hydrateStore(JSON.parse(window.__PRIEM_STORE__));
delete window.__PRIEM_STORE__;

// Note that the import order is important here
const App = require('./App').default;

hydrate(
    <BrowserRouter>
        <App />
    </BrowserRouter>,
    document.getElementById('root')
);

if (module.hot) {
    module.hot.accept();
}
