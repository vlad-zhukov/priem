import PropTypes from 'prop-types';

const {any, object, bool, string, func} = PropTypes;

export const priem = {
    /* State */
    priem: object.isRequired,
    setPriem: func.isRequired,
    setPriemTo: func.isRequired,
    refresh: func.isRequired,

    /* Initial config */
    priemName: string.isRequired,
    persist: bool.isRequired,
};

export const promiseState = {
    pending: bool.isRequired,
    refreshing: bool.isRequired,
    fulfilled: bool.isRequired,
    rejected: bool.isRequired,
    value: any,
    reason: string,
};
