import React from 'react';
import PropTypes from 'prop-types';
import {type} from './helpers';

export default class PriemFilter extends React.Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        initialValues: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        asyncValues: PropTypes.func,
        autoRefresh: PropTypes.bool,
        render: PropTypes.func,
        component: PropTypes.func,
        children: PropTypes.node,
        priem: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        initialize: PropTypes.func.isRequired,
        destroy: PropTypes.func.isRequired,
        update: PropTypes.func.isRequired,
        memoizedPool: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    };

    static defaultProps = {
        initialValues: {},
        asyncValues: null,
        autoRefresh: false,
        render: null,
        component: null,
        children: null,
        priem: undefined,
    };

    componentDidMount() {
        const {initialValues, priem = {}, initialize, destroy, update, memoizedPool, ...rest} = this.props;
        const fakeProps = {...rest, priem: {...initialValues, ...priem}};

        initialize(fakeProps);
        memoizedPool.runPromises({
            props: fakeProps,
            update: updater => update(rest.name, updater),
            onExpire: () => this.forceUpdate(),
            isForced: false,
        });
    }

    componentWillUpdate(nextProps) {
        const {memoizedPool, update, ...rest} = nextProps;
        memoizedPool.runPromises({
            props: rest,
            update: updater => update(rest.name, updater),
            onExpire: () => this.forceUpdate(),
            isForced: false,
        });
    }

    componentWillUnmount() {
        this.props.destroy(this.props.name);
    }

    // Always forces an update
    refresh = () => {
        const {memoizedPool, update, ...rest} = this.props;
        memoizedPool.runPromises({
            props: rest,
            update: updater => update(rest.name, updater),
            onExpire: () => this.forceUpdate(),
            isForced: true,
        });
    };

    setPriem = (updater) => {
        this.setPriemTo(this.props.name, updater);
    };

    setPriemTo = (name, updater) => {
        this.props.update(name, (s) => {
            // console.log(s)
            const nextState = type(updater) === 'function' ? updater(s) : updater;
            if (nextState != null) {
                return {data: nextState};
            }
        });
    };

    render() {
        if (!this.props.priem) {
            return null;
        }

        const {
            name,
            initialValues,
            asyncValues,
            initialize,
            destroy,
            update,
            render,
            component,
            children,
            ...rest
        } = this.props;

        const props = {
            ...rest,
            priemName: name,
            setPriem: this.setPriem,
            setPriemTo: this.setPriemTo,
            refresh: this.refresh,
        };

        if (type(render) === 'function') {
            return render(props);
        }

        if (component) {
            return React.createElement(component, props);
        }

        return React.Children.toArray(children).map(Child => React.cloneElement(Child, props));
    }
}
