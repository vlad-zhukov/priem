import memoize, {areKeysEqual, FULFILLED, REJECTED} from './memoize';
import * as promiseState from './promiseState';
import {assertType} from './helpers';

export default class Container {
    constructor(options) {
        assertType(options, ['object'], "AsyncContainer argument 'options'");
        assertType(options.promise, ['function'], "'promise'");
        assertType(options.mapPropsToArgs, ['function', 'undefined'], "'mapPropsToArgs'");

        this._mapPropsToArgs = options.mapPropsToArgs || (() => []);
        this._listeners = [];
        this._recentCallCount = 0;
        this._lastCallTime = 0;

        this._onCacheChange = this._onCacheChange.bind(this);

        this._memoized = memoize({
            fn: options.promise,
            maxSize: options.maxSize,
            maxAge: options.maxAge,
            onCacheChange: this._onCacheChange,
        });
    }

    _debouncedGet({props, forceRefresh}) {
        const args = this._mapPropsToArgs(props);
        assertType(args, ['array', 'null'], "The result of 'mapPropsToArgs(props)'");

        return this._memoized(args, {forceRefresh});
    }

    _get({props, forceRefresh}) {
        const now = Date.now();
        if (now - this._lastCallTime < 200) {
            if (this._recentCallCount > 100) {
                throw new Error(
                    "Priem: the amount of updates of 'Container' exceeded the safe threshold, which means " +
                        "it has stuck in an infinite rerendering loop. This happens when 'mapPropsToArgs' " +
                        'returns different results on consecutive calls. For example, this might be caused by ' +
                        'a race condition between 2 or more Priem components. Please, fix.'
                );
            }
            this._recentCallCount += 1;
        } else {
            this._recentCallCount = 1;
        }
        this._lastCallTime = now;

        //

        const res = this._debouncedGet({props, forceRefresh});

        switch (res.status) {
            case FULFILLED:
                return promiseState.fulfilled(res.value);
            case REJECTED:
                return promiseState.rejected(res.reason);
            default:
                return promiseState.pending();
        }
    }

    _onCacheChange({args, forceRefresh}) {
        this._listeners.forEach(comp => {
            if (areKeysEqual(args, this._mapPropsToArgs(comp.props))) {
                console.log(Date.now(), 'UPDATE', args);
                comp._update(forceRefresh);
            }
        });
    }

    _subscribe(component) {
        this._listeners.push(component);
    }

    _unsubscribe(component) {
        const index = this._listeners.findIndex(comp => comp === component);
        this._listeners.splice(index, 1);
    }
}
