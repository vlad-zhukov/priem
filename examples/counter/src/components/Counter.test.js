/**
 * @jest-environment jsdom
 */

import React from 'react';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import Counter, {counterContainer} from './Counter';

Enzyme.configure({adapter: new Adapter()});

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

    const component = Enzyme.mount(<Counter />);

    return {
        component,
        buttons: component.find('button'),
        span: component.find('span'),
    };
}

describe('Counter component', () => {
    it('should display count', () => {
        const {span} = setup();
        expect(span.text()).toMatch(/^Clicked: 0 times/);
    });

    it('first button should call increment', () => {
        const {buttons} = setup();
        buttons.at(0).simulate('click');
        expect(incrementSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('second button should call decrement', () => {
        const {buttons} = setup();
        buttons.at(1).simulate('click');
        expect(decrementSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('third button should not call incrementIfOddSpy if the counter is even', () => {
        const {buttons} = setup(42);
        buttons.at(2).simulate('click');
        expect(incrementIfOddSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).not.toHaveBeenCalled();
    });

    it('third button should call incrementIfOddSpy if the counter is odd', () => {
        const {buttons} = setup(43);
        buttons.at(2).simulate('click');
        expect(incrementIfOddSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('third button should call incrementIfOddSpy if the counter is odd and negative', () => {
        const {buttons} = setup(-43);
        buttons.at(2).simulate('click');
        expect(incrementIfOddSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toHaveBeenCalledTimes(1);
    });

    it('fourth button should call incrementAsyncSpy in a second', (done) => {
        const {buttons} = setup();
        buttons.at(3).simulate('click');
        setTimeout(() => {
            expect(incrementAsyncSpy).toHaveBeenCalledTimes(1);
            expect(setStateSpy).toHaveBeenCalledTimes(1);
            done();
        }, 1000);
    });
});
