import Cache from './Cache';
import {type, assertType, isBrowser} from './helpers';
import * as promiseState from './promiseState';

export default function createStore(initialStore = {}) {
    assertType(initialStore, ['object'], "'initialStore'");

    const containerMap = {};

    function getStore() {
        return Object.keys(containerMap).reduce((result, key) => {
            const container = containerMap[key];
            // eslint-disable-next-line no-param-reassign
            result[key] = {state: container.state, meta: container._meta};
            return result;
        }, {});
    }

    class Container {
        constructor(initialState, options) {
            assertType(initialState, ['object', 'undefined'], "'initialState'");
            assertType(options, ['object', 'undefined'], "'options'");

            this._listeners = [];
            this._options = options || {};

            const {ssrKey} = this._options;

            assertType(ssrKey, ['string', 'undefined'], "'ssrKey'");

            this._initialState = initialState || {};
            this._initialMeta = {ssr: !isBrowser};

            if (ssrKey) {
                if (containerMap[ssrKey]) {
                    throw new Error(`A 'ssrKey' must be unique across all containers, check '${ssrKey}'.`);
                }

                if (initialStore[ssrKey]) {
                    this._initialState = initialStore[ssrKey].state;
                    this._initialMeta = initialStore[ssrKey].meta;
                    delete initialStore[ssrKey]; // eslint-disable-line no-param-reassign
                }

                this._initialMeta.ssrKey = ssrKey;
                containerMap[ssrKey] = this;
            }

            this.state = this._initialState;
            this._meta = this._initialMeta;
        }

        setState(updater) {
            const nextState = type(updater) === 'function' ? updater(this.state) : updater;
            if (nextState != null) {
                this.state = {...this.state, ...nextState};
                this._listeners.forEach(fn => fn());
            }
        }

        _subscribe(fn) {
            this._listeners.push(fn);
        }

        _unsubscribe(fn) {
            this._listeners = this._listeners.filter(f => f !== fn);
            if (this._options.persist === false && this._listeners.length === 0) {
                this.state = this._initialState;
                this._meta = this._initialMeta;
            }
        }
    }

    class AsyncContainer extends Container {
        constructor(options) {
            assertType(options, ['object'], "AsyncContainer argument 'options'");
            assertType(options.promise, ['function'], "'promise'");
            assertType(options.mapPropsToArgs, ['function', 'undefined'], "'mapPropsToArgs'");

            super(promiseState.empty(), options);

            this._mapPropsToArgs = options.mapPropsToArgs || (() => []);
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
                args: this._mapPropsToArgs(props),
                promise: this._options.promise,
                autoRefresh: this._options.autoRefresh,
                maxAge: this._options.maxAge,
                maxArgs: this._options.maxArgs,
                maxSize: this._options.maxSize,
                isForced,
                update: this.update,
                onExpire: () => {
                    if (this._listeners.length > 0) {
                        this.runAsync({props, isForced: true});
                    }
                },
            });

        _unsubscribe(fn) {
            super._unsubscribe(fn);
            if (this._options.persist === false && this._listeners.length === 0 && this._cache.memoized) {
                this._cache.memoized.clear();
            }
        }
    }

    return {Container, AsyncContainer, getStore};
}
