import React from 'react';
import {Priem, Container} from 'priem';
import delay from 'delay';

const aLongPromise = new Container({
    promise: () => delay(1000, {value: 'SpongeBob'}),
    ssrKey: 'a-long-promise',
});

export default () => (
    <Priem sources={{aLongPromise}}>
        {(props, {pending}) => <h1>{pending ? 'Loading...' : props.aLongPromise}</h1>}
    </Priem>
);
