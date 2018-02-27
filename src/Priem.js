/* eslint-disable react/no-multi-comp */

import React from 'react';
import PropTypes from 'prop-types';
import createReactContext from 'create-react-context';
import PriemFilter from './PriemFilter';
import {extractAsyncValues} from './MemoizedPool';
import * as promiseState from './promiseState';

const createContext = typeof React.createContext === 'function' ? React.createContext : createReactContext;

const PriemContext = createContext({priem: {values: {}, meta: {}}});

export class PriemProvider extends React.Component {
    static propTypes = {
        children: PropTypes.node.isRequired,
    };

    /* eslint-disable react/no-unused-state */
    state = {
        values: {},
        meta: {},
    };
    /* eslint-enable react/no-unused-state */

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

export class Priem extends React.Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        initialValues: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        asyncValues: PropTypes.func,
        autoRefresh: PropTypes.bool,
        render: PropTypes.func,
        component: PropTypes.element,
        children: PropTypes.node,
    };

    static defaultProps = {
        initialValues: {},
        asyncValues: null,
        persist: true,
        autoRefresh: false,
        render: null,
        component: null,
        children: null,
    };

    renderConsumer = ({priemState, initialize, destroy, update}) => (
        <PriemFilter
            {...this.props}
            priem={priemState.values[this.props.name]}
            initialize={initialize}
            destroy={destroy}
            setPriem={updater => update(this.props.name, updater)}
            setPriemTo={update}
        />
    );

    render() {
        return <PriemContext.Consumer>{this.renderConsumer}</PriemContext.Consumer>;
    }
}
