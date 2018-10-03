import React from 'react';
import {assertType} from './helpers';

export function normalizeProps({children, component, sources, ...props}, forceRefresh) {
    assertType(sources, ['object'], "<Priem />'s 'sources'");
    Object.keys(sources).forEach(key => {
        // eslint-disable-next-line no-param-reassign
        props[key] = sources[key]._get(props, forceRefresh);
    });

    return props;
}

const DUMMY_STATE = {};

export default class Priem extends React.Component {
    constructor(props) {
        super(props);

        this._isPriemComponent = true;
        this._isMounted = false;
        this._shouldForceRefresh = false;

        this.refresh = this.refresh.bind(this);
    }

    componentDidMount() {
        this._isMounted = true;

        const {sources} = this.props;
        assertType(sources, ['object'], "<Priem />'s 'sources'");
        this._updateSubscriptions(Object.values(sources));
    }

    componentDidUpdate(prevProps) {
        const {sources} = this.props;
        const {sources: prevSources} = prevProps;

        assertType(sources, ['object'], "<Priem />'s 'sources'");

        const sourcesToUnsub = [];
        Object.keys(prevSources).forEach(key => {
            if (prevSources[key] !== sources[key]) {
                sourcesToUnsub.push(prevSources[key]);
            }
        });

        const sourcesToSub = [];
        Object.keys(sources).forEach(key => {
            if (sources[key] !== prevSources[key]) {
                sourcesToSub.push(sources[key]);
            }
        });

        this._updateSubscriptions(sourcesToSub, sourcesToUnsub);
    }

    componentWillUnmount() {
        this._isMounted = false;

        const {sources} = this.props;
        assertType(sources, ['object'], "<Priem />'s 'sources'");
        this._updateSubscriptions(undefined, Object.values(sources));
    }

    refresh() {
        this._getProps(false, true);
    }

    _update(forceRefresh) {
        if (forceRefresh === true) {
            this._shouldForceRefresh = true;
        }
        if (this._isMounted) {
            this.setState(DUMMY_STATE);
        }
    }

    _updateSubscriptions(sourcesToSub, sourcesToUnsub) {
        if (sourcesToSub) {
            sourcesToSub.forEach(instanceToSub => {
                instanceToSub._subscribe(this);
            });
        }

        if (sourcesToUnsub) {
            sourcesToUnsub.forEach(instanceToUnsub => {
                instanceToUnsub._unsubscribe(this);
            });
        }
    }

    _getProps(populateWithRefresh, forceRefresh) {
        if (this._shouldForceRefresh === true) {
            this._shouldForceRefresh = false;
            forceRefresh = true; // eslint-disable-line no-param-reassign
        }

        const props = normalizeProps(this.props, forceRefresh);
        if (populateWithRefresh) {
            props.refresh = this.refresh;
        }
        return props;
    }

    render() {
        const {children, component} = this.props;

        const props = this._getProps(true);

        if (component) {
            return React.createElement(component, props);
        }

        assertType(children, ['function'], "<Priem />'s 'children'");

        return children(props);
    }
}

Priem.defaultProps = {
    component: null,
    children: null,
};
