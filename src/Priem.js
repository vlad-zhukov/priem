import React from 'react';
import {populateProps} from './Container';
import {assertType} from './helpers';

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

        const {props, priemBag} = populateProps(this.props, forceRefresh);
        if (populateWithRefresh) {
            priemBag.refresh = this.refresh;
        }
        return {props, priemBag};
    }

    render() {
        const {children} = this.props;

        assertType(children, ['function'], "<Priem />'s 'children'");

        const {props, priemBag} = this._getProps(true);

        return children(props, priemBag);
    }
}

Priem.defaultProps = {
    children: null,
};
