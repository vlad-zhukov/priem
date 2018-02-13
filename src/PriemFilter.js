import React from 'react';
import {callPromises} from './cache';
import {extractAsyncValues} from './helpers';

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

    setPriem = (payload) => {
        this.props.update(this.props.name, payload);
    };

    refresh = () => {
        // Always forces an update
        callPromises({props: this.props, isForced: true});
    };

    render() {
        console.log('PriemFilter props', this.props);
        return this.props.render({
            priem: this.props.value,
            setPriem: this.setPriem,
            setPriemTo: this.props.update,
            refresh: this.refresh,
        });
    }
}
