/* eslint-disable react/no-multi-comp */

import React from 'react';
import PropTypes from 'prop-types';
import createReactContext from 'create-react-context';
import PriemFilter from './PriemFilter';
import {createInitializeFunction, createDestroyFunction, createUpdateFunction} from './store';
import {MemoizedPool} from './MemoizedPool';
import {priem} from './propTypes';

const PriemContext = createReactContext();

export class PriemProvider extends React.Component {
    static propTypes = {
        initialState: PropTypes.shape({
            state: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
            meta: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
        }),
        children: PropTypes.node.isRequired,
    };

    static defaultProps = {
        initialState: {
            state: {},
            meta: {},
        },
    };

    constructor(props) {
        super(props);
        this.state = props.initialState.state;
        this.meta = props.initialState.meta;

        this.memoizedPool = new MemoizedPool();

        this.initialize = createInitializeFunction(this);
        this.destroy = createDestroyFunction(this);
        this.update = createUpdateFunction(this);
    }

    render() {
        const value = {
            priemState: this.state,
            initialize: this.initialize,
            destroy: this.destroy,
            update: this.update,
            memoizedPool: this.memoizedPool,
        };
        return <PriemContext.Provider value={value}>{this.props.children}</PriemContext.Provider>;
    }
}

export class Priem extends React.Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        initialValues: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        asyncValues: PropTypes.func,
        persist: PropTypes.bool,
        autoRefresh: PropTypes.bool,
        render: PropTypes.func,
        component: PropTypes.func,
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

    renderConsumer = ({priemState, initialize, destroy, update, memoizedPool}) => (
        <PriemFilter
            {...this.props}
            priem={priemState?.[this.props.name]}
            initialize={initialize}
            destroy={destroy}
            update={update}
            memoizedPool={memoizedPool}
        />
    );

    render() {
        return <PriemContext.Consumer>{this.renderConsumer}</PriemContext.Consumer>;
    }
}
