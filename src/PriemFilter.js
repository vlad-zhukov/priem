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
        setPriem: PropTypes.func.isRequired,
        setPriemTo: PropTypes.func.isRequired,
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

    componentWillMount() {
        const {initialize, setPriem, memoizedPool, ...rest} = this.props;
        const fakeProps = {...rest, priem: this.props.initialValues};

        initialize(fakeProps);
        memoizedPool.runPromises({
            props: fakeProps,
            onChange: setPriem,
            onExpire: () => this.forceUpdate(),
            isForced: false,
        });
    }

    componentWillUpdate(nextProps) {
        const {setPriem, memoizedPool, ...rest} = nextProps;
        memoizedPool.runPromises({
            props: rest,
            onChange: setPriem,
            onExpire: () => this.forceUpdate(),
            isForced: false,
        });
    }

    componentWillUnmount() {
        this.props.destroy(this.props.name);
    }

    // Always forces an update
    refresh = () => {
        const {setPriem, memoizedPool, ...rest} = this.props;
        memoizedPool.runPromises({
            props: rest,
            onChange: setPriem,
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
            render,
            component,
            children,
            ...rest
        } = this.props;

        const props = {...rest, priemName: name, refresh: this.refresh};

        if (type(render) === 'function') {
            return render(props);
        }

        if (component) {
            return React.createElement(component, props);
        }

        return React.Children.toArray(children).map(Child => React.cloneElement(Child, props));
    }
}
