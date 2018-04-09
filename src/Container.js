import Cache from './Cache';
import {type, isBrowser} from './helpers';
import * as promiseState from './promiseState';

export class Container {
    constructor(initialState, options = {}) {
        const {meta} = options;

        this.state = initialState;
        this._meta = meta;
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

export class AsyncContainer extends Container {
    constructor(getAsyncValue, options = {}) {
        super();

        const {state, meta} = options;

        this.state = state || promiseState.empty();
        this._meta = meta || {ssr: !isBrowser};
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
