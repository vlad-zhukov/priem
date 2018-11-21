/* eslint-disable import/no-extraneous-dependencies */

import React from 'react';
import delay from 'delay';
import usePriem from '../src/usePriem';
import {Container, populateStore} from '../src/Container';

export function testComponent({initialStore, options} = {}) {
    if (initialStore) {
        populateStore(initialStore);
    }

    const ctr = new Container({
        promise: value => delay(100, {value}),
        ...options,
    });

    return ({args = ['foo']}) => {
        const res = usePriem(ctr, args);
        return <div>{res.data}</div>;
    };
}

export function testComponentNested({initialStore, ctr1Props, ctr2Props} = {}) {
    if (initialStore) {
        populateStore(initialStore);
    }

    const ctr1 = new Container({
        promise: value => delay(100, {value}),
        ...ctr1Props,
    });
    const ctr2 = new Container({
        promise: (ctr1Value, value) => delay(100, {value: ctr1Value + value}),
        ...ctr2Props,
    });

    return () => {
        const res1 = usePriem(ctr1, ['foo']);
        const res2 = usePriem(ctr2, !res1.data ? null : [res1.data, 'bar']);
        return <div>{res2.data}</div>;
    };
}

/* eslint-disable react/no-unused-state */
export class ErrorBoundary extends React.Component {
    constructor() {
        super();
        this.state = {initTime: Date.now(), hasError: null};
    }

    componentDidCatch(error) {
        this.setState({hasError: error, catchTime: Date.now()});
    }

    render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}
/* eslint-enable react/no-unused-state */
