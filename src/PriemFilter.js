import React from 'react';
import {extractAsyncValues, callPromises} from './callPromises';
import {type} from './helpers';

export default class PriemFilter extends React.Component {
    componentWillMount() {
        const fakeProps = {...this.props, priem: this.props.initialValues};

        this.props.initialize(fakeProps);
        callPromises({props: fakeProps, onExpire: () => this.forceUpdate(), isMounting: true});
    }

    shouldComponentUpdate(nextProps) {
        if (nextProps.priem === undefined || nextProps.asyncValues === undefined) return true;

        const asyncValues = extractAsyncValues(nextProps);
        const asyncKeys = Object.keys(asyncValues);
        if (asyncKeys.length === 0) return true;

        if (nextProps.autoRefresh !== false) {
            // If one of async values hasn't been added to the `priem` yet, prevent the update
            for (let i = 0, l = asyncKeys.length; i < l; i++) {
                if (nextProps.priem[asyncKeys[i]] === undefined) {
                    return false;
                }
            }
        }

        return true;
    }

    componentWillUpdate(nextProps) {
        callPromises({props: nextProps, prevProps: this.props, onExpire: () => this.forceUpdate()});
    }

    componentWillUnmount() {
        this.props.destroy(this.props.name);
    }

    refresh = () => {
        // Always forces an update
        callPromises({props: this.props, isForced: true});
    };

    render() {
        if (this.props.priem === undefined) {
            return null;
        }

        const {name, initialValues, asyncValues, initialize, destroy, render, children, ...rest} = this.props;

        const props = {...rest, priemName: name, refresh: this.refresh};

        if (type(render) === 'function') {
            return render(props);
        }

        return React.Children.toArray(children).map(Child => React.cloneElement(Child, props));
    }
}
