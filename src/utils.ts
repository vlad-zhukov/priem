import is, {TypeName} from '@sindresorhus/is';
import * as React from 'react';

export const isBrowser: boolean = typeof window === 'object' && typeof document === 'object' && document.nodeType === 9;

type BrowserActivityStateSubscriber = () => void;

class BrowserActivityState {
    private isOnline: boolean;
    private isVisible: boolean;
    private initialized = false;
    private readonly listeners: BrowserActivityStateSubscriber[] = [];

    constructor() {
        if (isBrowser) {
            this.isOnline = navigator.onLine;
            this.isVisible = !document.hidden;
        } else {
            this.isOnline = false;
            this.isVisible = false;
        }
    }

    isActive(): boolean {
        return this.isOnline && this.isVisible;
    }

    subscribe(fn: BrowserActivityStateSubscriber) {
        this.lazyInitialize();
        this.listeners.push(fn);
    }

    private updateOnlineStatus = () => {
        /* istanbul ignore else */
        if (this.isOnline !== navigator.onLine) {
            this.isOnline = navigator.onLine;
            this.listeners.forEach(listener => listener());
        }
    };

    private updateVisibilityStatus = () => {
        /* istanbul ignore else */
        if (this.isVisible !== !document.hidden) {
            this.isVisible = !document.hidden;
            this.listeners.forEach(listener => listener());
        }
    };

    private lazyInitialize() {
        if (!isBrowser || this.initialized) {
            return;
        }

        this.initialized = true;

        window.addEventListener('online', this.updateOnlineStatus, false);
        window.addEventListener('offline', this.updateOnlineStatus, false);
        window.addEventListener('visibilitychange', this.updateVisibilityStatus, false);
        window.addEventListener('focus', this.updateVisibilityStatus, false);
    }
}

export const browserActivityState = new BrowserActivityState();

export function assertType(variable: unknown, types: readonly TypeName[], variableName = 'The value'): void | never {
    const typeOfVariable = is(variable);

    let typesAsString = '';
    let isValid = false;
    for (let i = 0, l = types.length; i < l; i++) {
        if (typesAsString.length > 0) {
            typesAsString += ', ';
        }
        typesAsString += types[i];

        if (typeOfVariable === types[i]) {
            isValid = true;
        }
    }

    if (!isValid) {
        throw new TypeError(
            `Priem: ${variableName} must be one of the following: '${typesAsString}', but got: '${typeOfVariable}'.`,
        );
    }
}

function sameValueZeroEqual(obj1: unknown, obj2: unknown): obj1 is typeof obj2 {
    return obj1 === obj2 || (obj1 !== obj1 && obj2 !== obj2);
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const hasOwnProperty = Object.prototype.hasOwnProperty;

export function shallowEqual(a: unknown, b: unknown): boolean {
    if (sameValueZeroEqual(a, b)) {
        return true;
    }

    if (is.plainObject(a) && is.plainObject(b)) {
        const keysA = Object.keys(a);
        const {length} = keysA;

        if (Object.keys(b).length !== length) {
            return false;
        }

        let key: string;

        for (let index = 0; index < length; index++) {
            key = keysA[index];

            if (!hasOwnProperty.call(b, key)) {
                return false;
            }

            if (!sameValueZeroEqual(a[key], b[key])) {
                return false;
            }
        }

        return true;
    }

    return false;
}

const forceUpdateReducer = () => ({});
export function useForceUpdate(): () => void {
    const [, dispatch] = React.useReducer(forceUpdateReducer, {});
    return React.useRef(() => dispatch({})).current;
}

export function useLazyRef<T extends unknown>(initializer: () => T): {current: T} {
    const didMount = React.useRef(false);
    const ref = React.useRef<T>();
    if (!didMount.current) {
        ref.current = initializer();
        didMount.current = true;
    }
    return ref as {current: T};
}
