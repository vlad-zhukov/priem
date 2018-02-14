import React from 'react';
import ReactDOM from 'react-dom';
import {PriemProvider} from 'priem';
import ConnectedCounter from './components/Counter';

ReactDOM.render(
    <PriemProvider>
        <ConnectedCounter />
    </PriemProvider>,
    document.getElementById('root')
);
