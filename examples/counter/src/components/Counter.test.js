/**
 * @jest-environment jsdom
 */

import React from 'react';
import {render, fireEvent} from 'react-testing-library';
import Counter, {counterContainer} from './Counter';

const setStateSpy = jest.spyOn(counterContainer.__proto__, 'setState');
const incrementSpy = jest.spyOn(counterContainer, 'increment');
const decrementSpy = jest.spyOn(counterContainer, 'decrement');
const incrementIfOddSpy = jest.spyOn(counterContainer, 'incrementIfOdd');
const incrementAsyncSpy = jest.spyOn(counterContainer, 'incrementAsync');

function setup(value) {
    if (value != null) {
        counterContainer.setState({value});
    }

    setStateSpy.mockClear();
    incrementSpy.mockClear();
    decrementSpy.mockClear();
    incrementIfOddSpy.mockClear();
    incrementAsyncSpy.mockClear();

    const {container} = render(<Counter />);

    return {
        container,
        buttons: container.querySelectorAll('button'),
        span: container.querySelector('span'),
    };
}

describe('Counter component', () => {
    it('should display count', () => {
        const {span} = setup();
        expect(span.innerHTML).toBe('Clicked: 0 times');
    });

    it('first button should call increment', () => {
        const {buttons} = setup();
        fireEvent.click(buttons[0]);
        expect(incrementSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('second button should call decrement', () => {
        const {buttons} = setup();
        fireEvent.click(buttons[1]);
        expect(decrementSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('third button should not call incrementIfOddSpy if the counter is even', () => {
        const {buttons} = setup(42);
        fireEvent.click(buttons[2]);
        expect(incrementIfOddSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).not.toHaveBeenCalled();
    });

    it('third button should call incrementIfOddSpy if the counter is odd', () => {
        const {buttons} = setup(43);
        fireEvent.click(buttons[2]);
        expect(incrementIfOddSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('third button should call incrementIfOddSpy if the counter is odd and negative', () => {
        const {buttons} = setup(-43);
        fireEvent.click(buttons[2]);
        expect(incrementIfOddSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('fourth button should call incrementAsyncSpy in a second', done => {
        const {buttons} = setup();
        fireEvent.click(buttons[3]);
        setTimeout(() => {
            expect(incrementAsyncSpy).toHaveBeenCalledTimes(1);
            expect(setStateSpy).toHaveBeenCalledTimes(1);
            done();
        }, 1000);
    });
});
