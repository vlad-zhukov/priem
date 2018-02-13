import React from 'react';
import createReactContext from 'create-react-context';
import PriemFilter from './PriemFilter';
import {extractAsyncValues} from './helpers';
import * as promiseState from './promiseState';

const createContext = typeof React.createContext === 'function' ? React.createContext : createReactContext;

const PriemContext = createContext({priem: {values: {}, meta: {}}});

export class PriemProvider extends React.Component {
    state = {
        values: {},
        meta: {},
    };

    initialize = (props) => {
        console.log('initialize');

        this.setState((state) => {
            const nextValues = {...state.values};
            const nextMeta = {...state.meta};

            if (nextValues[props.name] !== undefined && nextMeta[props.name] !== undefined) {
                nextMeta[props.name] = {...nextMeta[props.name], count: (nextMeta[props.name].count += 1)};
            }
            else {
                const initialValues = {...props.initialValues};

                if (props.autoRefresh !== false) {
                    const asyncKeys = Object.keys(extractAsyncValues(props));
                    for (let i = 0, l = asyncKeys.length; i < l; i++) {
                        initialValues[asyncKeys[i]] = promiseState.pending();
                    }
                }

                nextValues[props.name] = initialValues;
                nextMeta[props.name] = {
                    name: props.name,
                    initialValues: props.initialValues,
                    persist: props.persist,
                    count: 1,
                };
            }

            return {
                values: nextValues,
                meta: nextMeta,
            };
        });
    };

    destroy = (name) => {
        console.log('destroy');

        this.setState((state) => {
            const nextValues = {...state.values};
            const nextMeta = {...state.meta};

            if (
                nextValues[name] !== undefined &&
                nextMeta[name] !== undefined &&
                nextMeta[name].count > 0 &&
                nextMeta[name].persist === true
            ) {
                nextMeta[name].count -= 1;
            }
            else {
                nextValues[name] = undefined;
                nextMeta[name] = undefined;
            }

            return {
                values: nextValues,
                meta: nextMeta,
            };
        });
    };

    update = (name, payload) => {
        console.log('update');

        this.setState((state) => {
            const nextValues = {...state.values};
            const nextMeta = {...state.meta};

            const payloadResult = typeof payload === 'function' ? payload(nextValues[name]) : payload;
            nextValues[name] = {...nextValues[name], ...payloadResult};

            return {
                values: nextValues,
                meta: nextMeta,
            };
        });
    };

    render() {
        console.log('STATE', this.state);

        const value = {priem: this.state, initialize: this.initialize, destroy: this.destroy, update: this.update};
        return <PriemContext.Provider value={value}>{this.props.children}</PriemContext.Provider>;
    }
}

export class Priem extends React.Component {
    render() {
        return (
            <PriemContext.Consumer>
                {({priem, initialize, destroy, update}) => (
                    <PriemFilter
                        {...this.props}
                        value={priem.values[this.props.name]}
                        initialize={initialize}
                        destroy={destroy}
                        update={update}
                    />
                )}
            </PriemContext.Consumer>
        );
    }
}
