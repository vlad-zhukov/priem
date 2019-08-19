import React from 'react';
import {createResource} from 'priem';
import delay from 'delay';

const useLongPromise = createResource(() => delay(1000, {value: 'SpongeBob'}), {
    ssrKey: 'a-long-promise',
});

export default () => {
    const [data, {pending}] = useLongPromise([]);
    return <h1>{pending ? 'Loading...' : data}</h1>;
};
