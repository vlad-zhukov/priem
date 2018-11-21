import React from 'react';
import {usePriem, Container} from 'priem';
import delay from 'delay';

const aLongPromise = new Container({
    promise: () => delay(1000, {value: 'SpongeBob'}),
    ssrKey: 'a-long-promise',
});

export default () => {
    const {data, pending} = usePriem(aLongPromise)
    return <h1>{pending ? 'Loading...' : data}</h1>;
};
