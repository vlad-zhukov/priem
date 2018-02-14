import React from 'react';
import {Priem, propTypes} from 'priem';

export class Counter extends React.Component {
    // static propTypes = propTypes.status;

    constructor(props, context) {
        super(props, context);

        this.increment = () => {
            this.props.setPriem(s => ({value: s.value + 1}));
        };

        this.decrement = () => {
            this.props.setPriem(s => ({value: s.value - 1}));
        };

        this.incrementIfOdd = () => {
            if (this.props.priemState.value % 2 !== 0) {
                this.increment();
            }
        };

        this.incrementAsync = () => {
            setTimeout(() => this.increment(), 1000);
        };
    }

    render() {
        console.log(this.props);

        return (
            <div>
                <span>Clicked: {this.props.priemState.value} times</span> <button onClick={this.increment}>+</button>{' '}
                <button onClick={this.decrement}>-</button>{' '}
                <button onClick={this.incrementIfOdd}>Increment if odd</button>{' '}
                <button onClick={this.incrementAsync}>Increment async</button>
            </div>
        );
    }
}

export default () => (
    <Priem name="Counter" initialValues={{value: 0}}>
        <Counter />
    </Priem>
);
