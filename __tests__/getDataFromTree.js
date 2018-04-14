/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import {getDataFromTree} from '../src/index';
import {walkTree} from '../src/getDataFromTree';
import {testComponent, testComponentNested} from '../__test-helpers__/util';

function times(n, fn) {
    const arr = new Array(n);
    const out = [];
    for (let i = 0, l = arr.length; i < l; i++) {
        out.push(fn(i));
    }
    return out;
}

describe('getDataFromTree()', () => {
    it('should fetch and render to string with data', async () => {
        const {element, getStore} = testComponent({options: {ssrKey: 'unique-key-1'}});
        await getDataFromTree(element);

        expect(getStore()).toMatchSnapshot();

        const content = ReactDOM.renderToStaticMarkup(element);

        expect(content).toBe('<div>foo</div>');
    });

    it('should fetch data from a nested component', async () => {
        const {element, getStore} = testComponentNested({
            syncContainerProps: {ssrKey: 'unique-key-1'},
            container1Props: {ssrKey: 'unique-key-2'},
            container2Props: {ssrKey: 'unique-key-3'},
        });
        await getDataFromTree(element);

        expect(getStore()).toMatchSnapshot();

        const content = ReactDOM.renderToStaticMarkup(element);

        expect(content).toBe('<div>2-foobar<button></button></div>');
    });

    it('should rehydrate data from initial store', async () => {
        const {element: serverElement, getStore} = testComponentNested({
            syncContainerProps: {ssrKey: 'unique-key-1'},
            container1Props: {ssrKey: 'unique-key-2'},
            container2Props: {ssrKey: 'unique-key-3'},
        });
        await getDataFromTree(serverElement);
        const initialStore = getStore();

        expect(initialStore).toMatchSnapshot();

        const {element: clientElement} = testComponentNested({
            initialStore,
            syncContainerProps: {ssrKey: 'unique-key-1'},
            container1Props: {ssrKey: 'unique-key-2'},
            container2Props: {ssrKey: 'unique-key-3'},
        });
        const content = ReactDOM.renderToStaticMarkup(clientElement);

        expect(content).toBe('<div>2-foobar<button></button></div>');
    });
});

function setupWalkTree(element) {
    const visitorSpy = jest.fn(() => {});
    walkTree(element, visitorSpy);
    return {visitorSpy};
}

describe('walkTree()', () => {
    it('traverses basic element trees', () => {
        const rootElement = (
            <div>
                <span>Foo</span>
                <span>Bar</span>
            </div>
        );
        const {visitorSpy} = setupWalkTree(rootElement);

        expect(visitorSpy).toHaveBeenCalledTimes(5);
    });

    it('traverses basic element trees with nulls', () => {
        const rootElement = <div>{null}</div>;
        const {visitorSpy} = setupWalkTree(rootElement);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses basic element trees with false', () => {
        const rootElement = <div>{false}</div>;
        const {visitorSpy} = setupWalkTree(rootElement);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses basic element trees with empty string', () => {
        const rootElement = <div />;
        const {visitorSpy} = setupWalkTree(rootElement);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses basic element trees with arrays', () => {
        const rootElement = [1, 2];
        const {visitorSpy} = setupWalkTree(rootElement);

        expect(visitorSpy).toHaveBeenCalledTimes(2);
    });

    it('traverses basic element trees with false or null', () => {
        const rootElement = [1, false, null, ''];
        const {visitorSpy} = setupWalkTree(rootElement);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses functional stateless components', () => {
        const MyComponent = ({n}) => <div>{times(n, i => <span key={i} />)}</div>;
        const {visitorSpy} = setupWalkTree(<MyComponent n={5} />);

        expect(visitorSpy).toHaveBeenCalledTimes(7);
    });

    it('traverses functional stateless components with children', () => {
        const MyComponent = ({n, children}) => (
            <div>
                {times(n, i => <span key={i} />)}
                {children}
            </div>
        );
        const {visitorSpy} = setupWalkTree(
            <MyComponent n={5}>
                <span>Foo</span>
            </MyComponent>
        );

        expect(visitorSpy).toHaveBeenCalledTimes(9);
    });

    it('traverses functional stateless components with null children', () => {
        const MyComponent = ({n, children = null}) => (
            <div>
                {times(n, i => <span key={i} />)}
                {children}
            </div>
        );
        const {visitorSpy} = setupWalkTree(<MyComponent n={5}>{null}</MyComponent>);

        expect(visitorSpy).toHaveBeenCalledTimes(7);
    });

    it('traverses functional stateless components that render null', () => {
        const MyComponent = () => null;
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses functional stateless components that render an array', () => {
        const MyComponent = () => [1, 2];
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(visitorSpy).toHaveBeenCalledTimes(3);
    });

    it('traverses functional stateless components that render with a null in array', () => {
        const MyComponent = () => [null, <div />];
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(visitorSpy).toHaveBeenCalledTimes(2);
    });

    it('traverses functional stateless components that render with a undefined in array', () => {
        const MyComponent = () => [undefined, <div />];
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(visitorSpy).toHaveBeenCalledTimes(2);
    });

    it('traverses classes', () => {
        class MyComponent extends React.Component {
            render() {
                return <div>{times(this.props.n, i => <span key={i} />)}</div>;
            }
        }
        const {visitorSpy} = setupWalkTree(<MyComponent n={5} />);

        expect(visitorSpy).toHaveBeenCalledTimes(7);
    });

    it('traverses classes components that render null', () => {
        class MyComponent extends React.Component {
            render() {
                return null;
            }
        }
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses classes components that render an array', () => {
        class MyComponent extends React.Component {
            render() {
                return [1, 2];
            }
        }
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(visitorSpy).toHaveBeenCalledTimes(3);
    });

    it('traverses classes components that render with a null in array', () => {
        class MyComponent extends React.Component {
            render() {
                return [null, <div />];
            }
        }
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(visitorSpy).toHaveBeenCalledTimes(2);
    });

    it('traverses classes with incomplete constructors', () => {
        class MyComponent extends React.Component {
            constructor() {
                super(null); // note doesn't pass props or context
            }
            render() {
                return <div>{times(this.props.n, i => <span key={i} />)}</div>;
            }
        }
        const {visitorSpy} = setupWalkTree(<MyComponent n={5} />);

        expect(visitorSpy).toHaveBeenCalledTimes(7);
    });

    it('traverses classes with children', () => {
        class MyComponent extends React.Component {
            render() {
                return (
                    <div>
                        {times(this.props.n, i => <span key={i} />)}
                        {this.props.children}
                    </div>
                );
            }
        }
        const {visitorSpy} = setupWalkTree(
            <MyComponent n={5}>
                <span>Foo</span>
            </MyComponent>
        );

        expect(visitorSpy).toHaveBeenCalledTimes(9);
    });

    it('traverses classes with render on instance', () => {
        class MyComponent extends React.Component {
            render = () => <div>{times(this.props.n, i => <span key={i} />)}</div>;
        }
        const {visitorSpy} = setupWalkTree(<MyComponent n={5} />);

        expect(visitorSpy).toHaveBeenCalledTimes(7);
    });
});
