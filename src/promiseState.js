import {type} from './helpers';

/**
 * Constructor for creating a new promiseState.
 * @param [options] {Object}
 * @param [options.pending] {Boolean}
 * @param [options.refreshing] {Boolean}
 * @param [options.fulfilled] {Boolean}
 * @param [options.rejected] {Boolean}
 * @param [options.value] {*}
 * @param [options.reason] {String|Null}
 * @returns {Object}
 */
function create({
    pending = false, // eslint-disable-line no-shadow
    refreshing = false, // eslint-disable-line no-shadow
    fulfilled = false, // eslint-disable-line no-shadow
    rejected = false, // eslint-disable-line no-shadow
    value = null,
    reason = null,
}) {
    return {
        pending,
        refreshing,
        fulfilled,
        rejected,
        value,
        reason,
    };
}

/**
 * Checks if a passed value is a promiseState-like object.
 * @param maybePromiseState {*}
 * @returns {Boolean}
 */
export function isPromiseState(maybePromiseState) {
    if (type(maybePromiseState) !== 'object') {
        return false;
    }

    const propertyNames = ['pending', 'refreshing', 'fulfilled', 'rejected'];
    return propertyNames.every(propertyName => type(maybePromiseState[propertyName]) === 'boolean');
}

/**
 * Checks if a passed promiseState is in a loading state.
 * @param promiseState {*}
 * @returns {Boolean}
 */
export function isLoading(promiseState) {
    if (isPromiseState(promiseState) === false) {
        throw new TypeError('Priem: Expected a promiseState.');
    }
    return promiseState.pending || promiseState.refreshing;
}

/**
 * Creates a new promiseState that is pending.
 * @returns {Object}
 */
export function pending() {
    return create({pending: true});
}

/**
 * Creates a promiseState that is refreshing.
 * Can be called without a previous promiseState and will be both pending and refreshing.
 * @param [previous] {Object}
 * @returns {Object}
 */
export function refreshing(previous) {
    const previousPromiseState = isPromiseState(previous) ? previous : pending();
    return create({...previousPromiseState, refreshing: true});
}

/**
 * Creates a promiseState that is resolved with the given value.
 * If the given value is already a promiseState, its `value` property will be used instead.
 * @param [valueOrPromiseState] {*}
 * @returns {Object}
 */
export function fulfilled(valueOrPromiseState) {
    const value = isPromiseState(valueOrPromiseState) ? valueOrPromiseState.value : valueOrPromiseState;
    return create({fulfilled: true, value});
}

/**
 * Creates a promiseState that is rejected with the given reason.
 * @param reason {String}
 * @returns {Object}
 */
export function rejected(reason) {
    return create({rejected: true, reason});
}
