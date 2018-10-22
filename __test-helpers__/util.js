/* eslint-disable import/no-extraneous-dependencies */

import React from 'react';
import delay from 'delay';
import Priem from '../src/Priem';
import {Container, populateStore} from '../src/Container';

export function testComponent({initialStore, options} = {}) {
    if (initialStore) {
        populateStore(initialStore);
    }

    const ctr = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
        ...options,
    });

    return <Priem sources={{ctr}}>{p => <div>{p.ctr}</div>}</Priem>;
}

export function testComponentNested({initialStore, ctr1Props, ctr2Props} = {}) {
    if (initialStore) {
        populateStore(initialStore);
    }

    const ctr1 = new Container({
        mapPropsToArgs: () => ['foo'],
        promise: value => delay(100, {value}),
        ...ctr1Props,
    });

    const ctr2 = new Container({
        mapPropsToArgs: p => (!p.ctr1 ? null : [p.ctr1, 'bar']),
        promise: (ctr1Value, value) => delay(100, {value: ctr1Value + value}),
        ...ctr2Props,
    });

    return (
        <Priem sources={{ctr1, ctr2}}>
            {props => (
                <Priem sources={{ctr2}} ctr1={props.ctr1}>
                    {p => <div>{p.ctr2}</div>}
                </Priem>
            )}
        </Priem>
    );
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
