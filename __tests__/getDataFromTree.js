/**
 * @jest-environment node
 */

/* eslint-disable react/no-multi-comp, react/prefer-stateless-function */

import React from 'react';
import ReactDOM from 'react-dom/server';
import delay from 'delay';
import Priem from '../src/Priem';
import createStore from '../src/createStore';
import getDataFromTree, {walkTree} from '../src/getDataFromTree';
import {testComponent, testComponentNested, times} from '../__test-helpers__/util';

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

    it('should catch all errors and reject the promise', async () => {
        const MyComponent = () => {
            throw new Error('foo');
        };

        await expect(getDataFromTree(<MyComponent />)).rejects.toThrow('foo');

        const {AsyncContainer} = createStore();

        const container1 = new AsyncContainer({
            mapPropsToArgs: () => {
                throw new Error('bar');
            },
            promise: () => delay(100),
        });
        const element1 = <Priem sources={{container1}}>{() => null}</Priem>;
        await expect(getDataFromTree(element1)).rejects.toThrow('bar');

        const container2 = new AsyncContainer({
            mapPropsToArgs: () => {
                throw new Error('baz');
            },
            promise: () => delay(100),
        });
        const element2 = <Priem sources={{container1, container2}}>{() => null}</Priem>;
        await expect(getDataFromTree(element2)).rejects.toThrow('2 errors were thrown when fetching containers.');
    });
});

function setupWalkTree(element, visitor = () => {}) {
    const visitorSpy = jest.fn(visitor);
    walkTree(element, visitorSpy);
    return {visitorSpy};
}

describe('walkTree()', () => {
    it('traverses basic element trees', () => {
        const element = (
            <div>
                <span>Foo</span>
                <span>Bar</span>
            </div>
        );
        const {visitorSpy} = setupWalkTree(element);

        expect(visitorSpy).toHaveBeenCalledTimes(5);
    });

    it('traverses basic element trees with nulls', () => {
        const element = <div>{null}</div>;
        const {visitorSpy} = setupWalkTree(element);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses basic element trees with false', () => {
        const element = <div>{false}</div>;
        const {visitorSpy} = setupWalkTree(element);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses basic element trees with empty string', () => {
        const element = <div />;
        const {visitorSpy} = setupWalkTree(element);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('traverses basic element trees with arrays', () => {
        const element = [1, 2];
        const {visitorSpy} = setupWalkTree(element);

        expect(visitorSpy).toHaveBeenCalledTimes(2);
    });

    it('traverses basic element trees with null, undefined and booleans', () => {
        const element = [1, false, null, '', 0, undefined, true];
        const {visitorSpy} = setupWalkTree(element);

        expect(visitorSpy).toHaveBeenCalledTimes(3);
    });

    it('should throw on unrenderable values', () => {
        expect(() => setupWalkTree({})).toThrow();
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
            render() {
                return <div>{times(this.props.n, i => <span key={i} />)}</div>;
            }
        }
        const {visitorSpy} = setupWalkTree(<MyComponent n={5} />);

        expect(visitorSpy).toHaveBeenCalledTimes(7);
    });

    it('should stop traversing if `visitor` returns false', () => {
        const element = <div>{times(5, i => <span key={i} />)}</div>;
        const {visitorSpy} = setupWalkTree(element, () => false);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop traversing classes if `visitor` returns false', () => {
        const MyComponent = ({n}) => <div>{times(n, i => <span key={i} />)}</div>;
        const {visitorSpy} = setupWalkTree(<MyComponent n={5} />, () => false);

        expect(visitorSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw if rendering returns undefined', () => {
        const MyComponent = () => undefined;
        expect(() => setupWalkTree(<MyComponent />)).toThrow();
    });

    it('should handle setState', () => {
        const setStateSpy = jest.fn(() => ({value: 1}));

        class MyComponent extends React.Component {
            state = {
                value: 0,
            };

            render() {
                if (this.state.value === 0) {
                    this.setState(setStateSpy);
                }

                if (this.state.value === 1) {
                    this.setState({value: 2});
                }

                return <div>{this.state.value}</div>;
            }
        }
        const {visitorSpy} = setupWalkTree(<MyComponent />);

        expect(setStateSpy).toHaveBeenCalledTimes(1);
        expect(visitorSpy).toHaveBeenCalledTimes(3);
    });
});
