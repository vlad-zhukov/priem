import React from 'react';
import {type, assertType} from './helpers';

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
        this._sources = props.sources;
    }

    componentDidMount() {
        this._isMounted = true;
        this._updateSubscriptions({instancesToSub: Object.values(this._sources)});
    }

    componentDidUpdate() {
        const {sources: nextSources} = this.props;

        const instancesToUnsub = [];
        Object.keys(this._sources).forEach(key => {
            if (this._sources[key] !== nextSources[key]) {
                instancesToUnsub.push(this._sources[key]);
            }
        });

        const instancesToSub = [];
        Object.keys(nextSources).forEach(key => {
            if (nextSources[key] !== this._sources[key]) {
                instancesToSub.push(nextSources[key]);
            }
        });

        this._sources = nextSources;
        this._updateSubscriptions({instancesToSub, instancesToUnsub});
    }

    componentWillUnmount() {
        this._isMounted = false;
        this._updateSubscriptions({instancesToUnsub: Object.values(this._sources)});
    }

    refresh = () => {
        this._updateSubscriptions({isForced: true});
    };

    _onUpdate = () => {
        if (this._isMounted) {
            this.setState(DUMMY_STATE);
        }
    };

    _updateSubscriptions({instancesToSub, instancesToUnsub, isForced = false}) {
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

        if (this._isMounted) {
            const props = this._getProps(false);
            Object.keys(this._sources).forEach(key => {
                const source = this._sources[key];
                if (type(source._runAsync) === 'function') {
                    source._runAsync({props, isForced});
                }
            });
        }
    }

    _getProps(populateWithRefresh) {
        const {component, children, sources, ...props} = this.props;
        Object.keys(this._sources).forEach(key => {
            const source = this._sources[key];
            props[key] = source.state;
            if (type(source._runAsync) === 'function') {
                props[key].refresh = () => {
                    source._runAsync({props, isForced: true});
                };
            }
        });

        if (populateWithRefresh) {
            props.refresh = this.refresh;
        }

        return props;
    }

    render() {
        const {component, children} = this.props;

        const props = this._getProps(true);

        if (component) {
            return React.createElement(component, props);
        }

        assertType(children, ['function'], "<Priem />'s 'children'");

        return children(props);
    }
}
