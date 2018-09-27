import React from 'react';
import {assertType} from './helpers';

const DUMMY_STATE = {};

export default class Priem extends React.Component {
    static defaultProps = {
        component: null,
        children: null,
    };

    constructor(props) {
        super(props);

        this._isPriemComponent = true;
        this._isMounted = false;
    }

    componentDidMount() {
        this._isMounted = true;
        this._updateSubscriptions({instancesToSub: Object.values(this.props.sources)});
    }

    componentDidUpdate(prevProps) {
        const {sources} = this.props;
        const {sources: prevSources} = prevProps;

        const instancesToUnsub = [];
        Object.keys(prevSources).forEach(key => {
            if (prevSources[key] !== sources[key]) {
                instancesToUnsub.push(prevSources[key]);
            }
        });

        const instancesToSub = [];
        Object.keys(sources).forEach(key => {
            if (sources[key] !== prevSources[key]) {
                instancesToSub.push(sources[key]);
            }
        });

        this._updateSubscriptions({instancesToSub, instancesToUnsub});
    }

    componentWillUnmount() {
        this._isMounted = false;
        this._updateSubscriptions({instancesToUnsub: Object.values(this.props.sources)});
    }

    refresh = () => {
        this._getProps(false, true);
    };

    _onUpdate = () => {
        if (this._isMounted) {
            this.setState(DUMMY_STATE);
        }
    };

    _updateSubscriptions({instancesToSub, instancesToUnsub}) {
        if (instancesToSub) {
            instancesToSub.forEach(instanceToSub => {
                instanceToSub._subscribe(this._onUpdate);
            });
        }

        if (instancesToUnsub) {
            instancesToUnsub.forEach(instanceToUnsub => {
                instanceToUnsub._unsubscribe(this._onUpdate);
            });
        }
    }

    _getProps(populateWithRefresh, forceRefresh) {
        const {children, component, sources, ...props} = this.props;
        Object.keys(sources).forEach(key => {
            props[key] = sources[key]._get({props, forceRefresh});
        });

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
