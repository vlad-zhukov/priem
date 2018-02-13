import PropTypes from 'prop-types';

const {any, object, bool, string, func} = PropTypes;

export const status = {
    /* State */
    status: object.isRequired,
    setStatus: func.isRequired,
    setStatusTo: func.isRequired,
    refresh: func.isRequired,
    initialize: func.isRequired,
    destroy: func.isRequired,
    dispatch: func.isRequired,

    /* Initial config */
    statusName: string.isRequired,
    persist: bool.isRequired,
    autoRefresh: bool.isRequired,
    getStatusState: func,
};

export const promiseState = {
    pending: bool.isRequired,
    refreshing: bool.isRequired,
    fulfilled: bool.isRequired,
    rejected: bool.isRequired,
    value: any,
    reason: string,
};
