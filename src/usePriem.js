import {useRef, useState, useEffect} from 'react';
import {Container} from './Container';
import {areKeysEqual, PENDING, FULFILLED, REJECTED} from './memoize';
import {assertType} from './helpers';

function usePriem(container, args = []) {
    if (!(container instanceof Container)) {
        throw new TypeError("usePriem: 'source' must be an instance of 'Container'.");
    }
    assertType(args, ['array', 'null'], '`args`');

    const source = useRef(container);

    if (source.current !== container) {
        throw new TypeError("usePriem: it looks like you've passed a different 'source' value after initializing.");
    }

    const componentRef = useRef(null);
    const shouldForceUpdate = useRef(false);
    const dummyState = useState(null);

    componentRef.current = (prevArgs, forceUpdate) => {
        if (prevArgs !== null && args !== null && areKeysEqual(args, prevArgs)) {
            shouldForceUpdate.current = forceUpdate;
            dummyState[1](null);
        }
    };

    useEffect(() => {
        source.current._subscribe(componentRef);
        return () => source.current._unsubscribe(componentRef);
    }, []);

    const forceUpdate = shouldForceUpdate.current;
    shouldForceUpdate.current = false;

    const result = source.current._get(args, forceUpdate);

    const out = {
        data: null,
        pending: true,
        fulfilled: false,
        rejected: false,
        reason: null,
        refresh() {
            shouldForceUpdate.current = true;
            dummyState[1](null);
        },
    };

    if (result !== null) {
        out.data = result.data;
        out.pending = result.status === PENDING;
        out.fulfilled = result.status === FULFILLED;
        out.rejected = result.status === REJECTED;
        out.reason = result.reason;
    }

    return out;
}

export default usePriem;
