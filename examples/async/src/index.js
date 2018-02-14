import React from 'react';
import ReactDOM from 'react-dom';
import {PriemProvider} from 'priem';
import App from './containers/App';

ReactDOM.render(
    <PriemProvider>
        <App />
    </PriemProvider>,
    document.getElementById('root')
);
