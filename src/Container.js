import memoize, {FULFILLED, REJECTED} from './memoize';
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
        this._prevProps = {};

        this._notify = this._notify.bind(this);

        this._memoized = memoize(options.promise, {
            maxSize: options.maxSize,
            maxAge: options.maxAge,
            onCacheChange: this._notify,
        });

        this._debouncedGet = function(props = this._prevProps, isForced = false) {
            this._prevProps = props;

            const args = this._mapPropsToArgs(props);
            assertType(args, ['array', 'null'], "The result of 'mapPropsToArgs(props)'");

            return this._memoized.apply({isForced}, args);
        };
    }

    _get(props, isForced) {
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

        const res = this._debouncedGet(props, isForced);

        console.log(res);

        switch (res.status) {
            case FULFILLED:
                return promiseState.fulfilled(res.value);
            case REJECTED:
                return promiseState.rejected(res.reason);
            default:
                return promiseState.pending();
        }
    }

    _notify() {
        this._listeners.forEach(fn => fn());
    }

    _subscribe(fn) {
        this._listeners.push(fn);
    }

    _unsubscribe(fn) {
        this._listeners = this._listeners.filter(f => f !== fn);
    }

    refresh() {
        const res = this._debouncedGet(this._prevProps, true);
        return res.promise;
    }
}
