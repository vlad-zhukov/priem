import React from 'react';
import createReactContext from 'create-react-context';
import PriemFilter from './PriemFilter';
import {extractAsyncValues} from './callPromises';
import * as promiseState from './promiseState';

const createContext = typeof React.createContext === 'function' ? React.createContext : createReactContext;

const PriemContext = createContext({priem: {values: {}, meta: {}}});

export class PriemProvider extends React.Component {
    state = {
        values: {},
        meta: {},
    };

    initialize = (props) => {
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

    update = (name, updater) => {
        this.setState((state) => {
            const nextValues = {...state.values};
            const nextMeta = {...state.meta};

            const updaterResult = typeof updater === 'function' ? updater(nextValues[name]) : updater;
            nextValues[name] = {...nextValues[name], ...updaterResult};

            return {
                values: nextValues,
                meta: nextMeta,
            };
        });
    };

    render() {
        const value = {priemState: this.state, initialize: this.initialize, destroy: this.destroy, update: this.update};
        return <PriemContext.Provider value={value}>{this.props.children}</PriemContext.Provider>;
    }
}

export const Priem = props => (
    <PriemContext.Consumer>
        {({priemState, initialize, destroy, update}) => (
            <PriemFilter
                {...props}
                priem={priemState.values[props.name]}
                initialize={initialize}
                destroy={destroy}
                setPriem={updater => update(props.name, updater)}
                setPriemTo={update}
            />
        )}
    </PriemContext.Consumer>
);

Priem.defaultProps = {
    name: undefined,
    initialValues: {},
    asyncValues: undefined,
    persist: true,
    autoRefresh: false,
};
