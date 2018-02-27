import React from 'react';
import ReactDOM from 'react-dom';
import {PriemProvider} from 'priem';
import Counter from './components/Counter';

ReactDOM.render(
    <PriemProvider>
        <Counter />
    </PriemProvider>,
    document.getElementById('root')
);
