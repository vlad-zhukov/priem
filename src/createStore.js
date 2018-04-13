import Cache from './Cache';
import {type, isBrowser} from './helpers';
import * as promiseState from './promiseState';

export default function createStore(initialStore = {}) {
    const typeOfInitialStore = type(initialStore);
    if (typeOfInitialStore !== 'object') {
        throw new TypeError(`'initialStore' must be an object, but got: ${typeOfInitialStore}`);
    }

    const maps = {
        containerMap: {},
        stateMap: initialStore,
    };

    function getStore() {
        return Object.keys(maps.containerMap).reduce((result, key) => {
            const container = maps.containerMap[key];
            result[key] = {state: container.state, meta: container._meta};
            return result;
        }, {});
    }

    class Container {
        constructor(initialState, options = {}) {
            const {meta, ssrKey} = options;

            this.state = initialState;
            this._meta = meta || {ssr: !isBrowser};

            if (type(ssrKey) === 'string') {
                if (maps.containerMap[ssrKey]) {
                    throw new Error(
                        `A 'ssrKey' must be unique across all containers. Please check the following 'ssrKey': ${ssrKey}.`
                    );
                }

                if (maps.stateMap[ssrKey]) {
                    this.state = maps.stateMap[ssrKey].state;
                    this._meta = maps.stateMap[ssrKey].meta;
                    delete maps.stateMap[ssrKey];
                }

                this._meta.ssrKey = ssrKey;
                maps.containerMap[ssrKey] = this;
            }

            this._listeners = [];
        }

        setState(updater) {
            const nextState = type(updater) === 'function' ? updater(this.state) : updater;
            if (nextState != null) {
                this.state = {...this.state, ...nextState};
                this._listeners.forEach(fn => fn());
            }
        }

        subscribe(fn) {
            this._listeners.push(fn);
        }

        unsubscribe(fn) {
            this._listeners = this._listeners.filter(f => f !== fn);
        }
    }

    class AsyncContainer extends Container {
        constructor(getAsyncValue, options = {}) {
            super(options.state || promiseState.empty(), options);

            this._getAsyncValue = getAsyncValue;
            this._cache = new Cache();
        }

        update = (updater) => {
            this.setState((state) => {
                const updaterResult = type(updater) === 'function' ? updater(state, this._meta) : updater;

                if (updaterResult != null) {
                    // eslint-disable-next-line no-param-reassign
                    this._meta = {...this._meta, ...updaterResult.meta};

                    if (updaterResult.state) {
                        return {...state, ...updaterResult.state};
                    }
                }

                return null;
            });
        };

        runAsync = ({props, isForced}) =>
            this._cache.run({
                asyncValue: this._getAsyncValue(props),
                isForced,
                update: this.update,
                onExpire: () => {
                    if (this._listeners.length > 0) {
                        this.runAsync({props, isForced: true, update: this.update});
                    }
                },
            });
    }

    return {Container, AsyncContainer, getStore};
}
