import React from 'react';
import PropTypes from 'prop-types';
import {type} from './helpers';

export default class PriemContainer extends React.Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        initialValues: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        asyncValues: PropTypes.func,
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
        render: null,
        component: null,
        children: null,
        priem: undefined,
    };

    componentDidMount() {
        const {initialValues, priem = {}, memoizedPool, initialize, destroy, update, ...rest} = this.props;
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
        const {memoizedPool, initialize, destroy, update, ...rest} = nextProps;

        initialize(rest);
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
            return null;
        });
    };

    // Always forces an update
    refresh = (props) => {
        const {memoizedPool, update, ...rest} = this.props;
        memoizedPool.runPromises({
            props: {...rest, ...props},
            update: updater => update(rest.name, updater),
            onExpire: () => this.forceUpdate(),
            isForced: true,
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
