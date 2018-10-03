import React from 'react';
import {Priem, Container} from 'priem';

const delay = value => new Promise(resolve => setTimeout(() => resolve(value), 1000));

const aLongPromise = new Container({
    promise: () => delay('SpongeBob'),
    ssrKey: 'a-long-promise',
});

export default () => (
    <Priem sources={{aLongPromise}}>{props => <h1>{props.aLongPromise.data || 'Loading...'}</h1>}</Priem>
);
