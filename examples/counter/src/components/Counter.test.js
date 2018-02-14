import React from 'react';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {Counter} from './Counter';

Enzyme.configure({adapter: new Adapter()});

function setup(value = 0) {
    const props = {
        status: {value},
        setStatus: jest.fn(),
    };
    const component = Enzyme.shallow(<Counter {...props} />);

    return {
        component,
        props,
        buttons: component.find('button'),
        span: component.find('span'),
    };
}

describe('Counter component', () => {
    it('should display count', () => {
        const {span} = setup();
        expect(span.text()).toMatch(/^Clicked: 0 times/);
    });

    it('first button should call setStatus', () => {
        const {buttons, props} = setup();
        buttons.at(0).simulate('click');
        expect(props.setStatus).toBeCalled();
    });

    it('second button should call setStatus', () => {
        const {buttons, props} = setup();
        buttons.at(1).simulate('click');
        expect(props.setStatus).toBeCalled();
    });

    it('third button should not call setStatus if the counter is even', () => {
        const {buttons, props} = setup(42);
        buttons.at(2).simulate('click');
        expect(props.setStatus).not.toBeCalled();
    });

    it('third button should call setStatus if the counter is odd', () => {
        const {buttons, props} = setup(43);
        buttons.at(2).simulate('click');
        expect(props.setStatus).toBeCalled();
    });

    it('third button should call setStatus if the counter is odd and negative', () => {
        const {buttons, props} = setup(-43);
        buttons.at(2).simulate('click');
        expect(props.setStatus).toBeCalled();
    });

    it('fourth button should call setStatus in a second', (done) => {
        const {buttons, props} = setup();
        buttons.at(3).simulate('click');
        setTimeout(() => {
            expect(props.setStatus).toBeCalled();
            done();
        }, 1000);
    });
});
