import React from 'react';
import PropTypes from 'prop-types';
import {MemoizedPool} from './MemoizedPool';
import {type} from './helpers';

const memoizePool = new MemoizedPool();

export default class PriemFilter extends React.Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        initialValues: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        asyncValues: PropTypes.func,
        autoRefresh: PropTypes.bool,
        render: PropTypes.func,
        component: PropTypes.element,
        children: PropTypes.node,
        priem: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        initialize: PropTypes.func.isRequired,
        destroy: PropTypes.func.isRequired,
        setPriem: PropTypes.func.isRequired,
        setPriemTo: PropTypes.func.isRequired,
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
        const fakeProps = {...this.props, priem: this.props.initialValues};

        this.props.initialize(fakeProps);
        memoizePool.runPromises({
            props: fakeProps,
            onChange: fakeProps.setPriem,
            onExpire: () => this.forceUpdate(),
            isForced: false,
        });
    }

    componentWillUpdate(nextProps) {
        memoizePool.runPromises({
            props: nextProps,
            onChange: nextProps.setPriem,
            onExpire: () => this.forceUpdate(),
            isForced: false,
        });
    }

    componentWillUnmount() {
        this.props.destroy(this.props.name);
    }

    refresh = () => {
        // Always forces an update
        memoizePool.runPromises({
            props: this.props,
            onChange: this.props.setPriem,
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
