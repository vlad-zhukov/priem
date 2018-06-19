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
            result[key] = {state: container._state, meta: container._meta};
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

            this._state = this._initialState;
            this._meta = this._initialMeta;
        }

        get state() {
            return this._state;
        }

        setState(updater) {
            const nextState = type(updater) === 'function' ? updater(this._state) : updater;
            if (nextState != null) {
                this._state = {...this._state, ...nextState};
                this._listeners.forEach(fn => fn());
            }
        }

        _subscribe(fn) {
            this._listeners.push(fn);
        }

        _unsubscribe(fn) {
            this._listeners = this._listeners.filter(f => f !== fn);
            if (this._options.persist === false && this._listeners.length === 0) {
                this._state = this._initialState;
                this._meta = this._initialMeta;
            }
        }
    }

    class AsyncContainer extends Container {
        constructor(options) {
            assertType(options, ['object'], "AsyncContainer argument 'options'");
            assertType(options.promise, ['function'], "'promise'");
            assertType(options.mapPropsToArgs, ['function', 'undefined'], "'mapPropsToArgs'");

            super(promiseState.pending(), options);

            this._update = this._update.bind(this);
            this._runAsync = this._runAsync.bind(this);

            this._mapPropsToArgs = options.mapPropsToArgs || (() => []);
            this._cache = new Cache({
                promise: options.promise,
                maxAge: options.maxAge,
                maxArgs: options.maxArgs,
                maxSize: options.maxSize,
                update: this._update,
                runAsync: this._runAsync,
            });
            this._recentCallCount = 0;
            this._lastCallTime = 0;
            this._prevProps = {};
        }

        _update(updater) {
            this.setState((state) => {
                const updaterResult = type(updater) === 'function' ? updater(state, this._meta) : updater;

                if (updaterResult != null) {
                    this._meta = {...this._meta, ...updaterResult.meta};

                    if (updaterResult.state) {
                        return {...state, ...updaterResult.state};
                    }
                }

                return null;
            });
        }

        _runAsync(options) {
            const now = Date.now();
            if (now - this._lastCallTime < 200) {
                if (this._recentCallCount > 100) {
                    throw new Error(
                        "Priem: the amount of updates of 'AsyncContainer' exceeded the safe threshold, which means " +
                            "it has stuck in an infinite rerender loop. This happens when 'mapPropsToArgs' returns " +
                            'different results on consecutive calls. For example, this might be caused by ' +
                            'a race condition between 2 or more Priem components. Please, fix.'
                    );
                }
                this._recentCallCount += 1;
            }
            else {
                this._recentCallCount = 1;
            }
            this._lastCallTime = now;

            const props = (options && options.props) || this._prevProps;
            this._prevProps = props;

            const args = this._mapPropsToArgs(props);
            assertType(args, ['array', 'null'], "The result of 'mapPropsToArgs(props)'");

            return this._cache.run({
                args,
                autoRefresh: this._options.autoRefresh,
                isForced: (options && options.isForced) || false,
            });
        }

        _unsubscribe(fn) {
            super._unsubscribe(fn);
            if (this._options.persist === false && this._listeners.length === 0 && this._cache.memoized) {
                this._cache.memoized.clear();
            }
        }
    }

    return {Container, AsyncContainer, getStore};
}
