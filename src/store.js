import * as promiseState from './promiseState';
import {extractAsyncValues} from './MemoizedPool';
import {type, isBrowser} from './helpers';

export const consts = {
    NAME: '@@name',
    INITIAL_VALUES: '@@initialValues',
    COUNT: '@@count',
    PERSIST: '@@persist',
};

export function createInitializeFunction(component, isFake = false) {
    const countStep = isFake ? 0 : 1;

    return props =>
        new Promise((resolve) => {
            component.setState(
                (state) => {
                    const s = state[props.name];
                    const m = component.meta[props.name];

                    if (s && m) {
                        // eslint-disable-next-line no-param-reassign
                        component.meta[props.name] = {...m, [consts.COUNT]: (m[consts.COUNT] += countStep)};
                        return null;
                    }

                    const initialValues = {...props.priem};
                    const meta = {};

                    if (props.autoRefresh !== false) {
                        const asyncKeys = Object.keys(extractAsyncValues(props));
                        for (let i = 0, l = asyncKeys.length; i < l; i++) {
                            initialValues[asyncKeys[i]] = promiseState.pending();
                            meta[asyncKeys[i]] = {ssr: !isBrowser};
                        }
                    }

                    // eslint-disable-next-line no-param-reassign
                    component.meta[props.name] = {
                        [consts.NAME]: props.name,
                        [consts.INITIAL_VALUES]: props.initialValues,
                        [consts.PERSIST]: props.persist,
                        [consts.COUNT]: countStep,
                        ...meta,
                    };
                    return {
                        [props.name]: initialValues,
                    };
                },
                () => resolve(component.state[props.name])
            );
        });
}

export function createDestroyFunction(component, isFake = false) {
    return name =>
        new Promise((resolve) => {
            if (isFake) {
                resolve(component.state[name]);
                return;
            }

            component.setState(
                (state) => {
                    const s = state[name];
                    const m = component.meta[name];
                    if (s && m && m[consts.COUNT] > 0 && m[consts.PERSIST] === true) {
                        // eslint-disable-next-line no-param-reassign
                        component.meta[name] = {...m, [consts.COUNT]: m[consts.COUNT] - 1};
                        return null;
                    }

                    // eslint-disable-next-line no-param-reassign
                    component.meta[name] = undefined;
                    return {[name]: undefined};
                },
                () => resolve(component.state[name])
            );
        });
}

export function createUpdateFunction(component) {
    return (name, updater) =>
        new Promise((resolve) => {
            let didUpdate = false;
            component.setState(
                (state) => {
                    const s = state[name];
                    const m = component.meta[name];

                    const updaterResult = type(updater) === 'function' ? updater(s, m) : updater;

                    if (updaterResult != null) {
                        // eslint-disable-next-line no-param-reassign
                        component.meta[name] = {...m, ...updaterResult.meta};

                        if (updaterResult.data) {
                            didUpdate = true;
                            return {
                                [name]: {...s, ...updaterResult.data},
                            };
                        }
                    }

                    return null;
                },
                () => resolve(didUpdate ? component.state[name] : undefined)
            );
        });
}

export class FakeProviderStore {
    constructor() {
        this.state = {};
        this.meta = {};

        this.initialize = createInitializeFunction(this, true);
        this.destroy = createDestroyFunction(this, true);
        this.update = createUpdateFunction(this);
    }

    setState(updater, callback) {
        const nextState = type(updater) === 'function' ? updater(this.state) : updater;
        if (nextState != null) {
            this.state = {...this.state, ...nextState};
        }
        if (type(callback) === 'function') {
            callback();
        }
    }
}
