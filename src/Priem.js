import React from 'react';
import PropTypes from 'prop-types';
import {type} from './helpers';

const DUMMY_STATE = {};

export default class Priem extends React.Component {
    static propTypes = {
        sources: PropTypes.object.isRequired,
        render: PropTypes.func,
        component: PropTypes.func,
        children: PropTypes.node,
    };

    static defaultProps = {
        render: null,
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
        this._updateSubscriptions({instancesToSub: this._sources});
    }

    componentDidUpdate() {
        const {sources: nextSources} = this.props;

        const instancesToUnsub = {};
        Object.keys(this._sources).forEach((key) => {
            if (this._sources[key] !== nextSources[key]) {
                instancesToUnsub[key] = this._sources[key];
            }
        });

        const instancesToSub = {};
        Object.keys(nextSources).forEach((key) => {
            if (nextSources[key] !== this._sources[key]) {
                instancesToSub[key] = nextSources[key];
            }
        });

        this._sources = nextSources;
        this._updateSubscriptions({instancesToSub, instancesToUnsub});
    }

    componentWillUnmount() {
        this._isMounted = false;
        this._updateSubscriptions({instancesToUnsub: this._sources});
    }

    _updateSubscriptions({instancesToSub = {}, instancesToUnsub = {}, isForced = false}) {
        const instanceToSubKeys = Object.keys(instancesToSub);
        const instanceToUnsubKeys = Object.keys(instancesToUnsub);

        instanceToSubKeys.forEach((key) => {
            instancesToSub[key].subscribe(this._onUpdate);
        });

        instanceToUnsubKeys.forEach((key) => {
            instancesToUnsub[key].unsubscribe(this._onUpdate);
        });

        if (this._isMounted) {
            const props = this._getProps();
            Object.keys(this._sources).forEach((key) => {
                const {runAsync} = this._sources[key];
                if (type(runAsync) === 'function') {
                    runAsync({props, isForced});
                }
            });
        }
    }

    _getProps() {
        const {render, component, children, sources, ...props} = this.props;
        Object.keys(this._sources).forEach((key) => {
            const instance = this._sources[key];
            props[key] = instance.state;
        });
        return props;
    }

    _onUpdate = () => {
        if (this._isMounted) {
            this.setState(DUMMY_STATE);
        }
    };

    render() {
        const {render, component, children} = this.props;

        const props = this._getProps();

        if (type(render) === 'function') {
            return render(props);
        }

        if (component) {
            return React.createElement(component, props);
        }

        return React.Children.toArray(children).map(child => React.cloneElement(child, props));
    }
}
