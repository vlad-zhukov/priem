import React from 'react';
import {Priem} from 'priem';

export default () => (
    <Priem
        name="Counter"
        initialValues={{value: 0}}
        render={({priem, setPriem}) => {
            const increment = () => {
                setPriem(s => ({value: s.value + 1}));
            };

            const decrement = () => {
                setPriem(s => ({value: s.value - 1}));
            };

            const incrementIfOdd = () => {
                if (priem.value % 2 !== 0) {
                    increment();
                }
            };

            const incrementAsync = () => {
                setTimeout(() => increment(), 1000);
            };

            return <div>
                <span>Clicked: {priem.value} times</span>
                <button onClick={increment}>+</button>
                {' '}
                <button onClick={decrement}>-</button>
                {' '}
                <button onClick={incrementIfOdd}>Increment if odd</button>
                {' '}
                <button onClick={incrementAsync}>Increment async</button>
            </div>
        }}
    />
);
