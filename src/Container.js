import Cache from './Cache';
import {type, isBrowser} from './helpers';
import * as promiseState from './promiseState';

export class Container {
    constructor(initialState = {}) {
        this.state = initialState;
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
    constructor(getAsyncValue, initialState) {
        super();

        this.getAsyncValue = getAsyncValue;
        this.state = initialState?.state || promiseState.empty();
        this.meta = initialState?.meta || {ssr: !isBrowser};
        this.cache = new Cache();
    }

    update = (updater) => {
        this.setState((state) => {
            const updaterResult = type(updater) === 'function' ? updater(state, this.meta) : updater;

            if (updaterResult != null) {
                // eslint-disable-next-line no-param-reassign
                this.meta = {...this.meta, ...updaterResult.meta};

                if (updaterResult.data) {
                    return {...state, ...updaterResult.data};
                }
            }

            return null;
        });
    };

    runAsync = ({props, isForced}) =>
        this.cache.run({
            asyncValue: this.getAsyncValue(props),
            isForced,
            update: this.update,
            onExpire: () => {
                if (this._listeners.length > 0) {
                    this.runAsync({props, isForced: true, update: this.update});
                }
            },
        });
}
