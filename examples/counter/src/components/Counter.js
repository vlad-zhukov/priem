import React from 'react';
import {Priem, createStore} from 'priem';

const {Container} = createStore();

class CounterContainer extends Container {
    increment = () => {
        this.setState({value: this.state.value + 1});
    };

    decrement = () => {
        this.setState({value: this.state.value - 1});
    };

    incrementIfOdd = () => {
        if (this.state.value % 2 !== 0) {
            this.increment();
        }
    };

    incrementAsync = () => {
        setTimeout(() => this.increment(), 1000);
    };
}

export const counterContainer = new CounterContainer({value: 0});

export default () => (
    <Priem sources={{counter: counterContainer}}>
        {({counter}) => (
            <div>
                <span>Clicked: {counter.value} times </span>
                <button onClick={counterContainer.increment}>+</button>{' '}
                <button onClick={counterContainer.decrement}>-</button>{' '}
                <button onClick={counterContainer.incrementIfOdd}>Increment if odd</button>{' '}
                <button onClick={counterContainer.incrementAsync}>Increment async</button>
            </div>
        )}
    </Priem>
);
