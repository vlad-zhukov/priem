import {useRef, useState, useEffect} from 'react';
import {Resource} from './Resource';
import {areKeysEqual, PENDING, FULFILLED, REJECTED} from './memoize';
import {assertType} from './helpers';

function usePriem(resource, args = []) {
    if (!(resource instanceof Resource)) {
        throw new TypeError("usePriem: 'source' must be an instance of 'Resource'.");
    }
    assertType(args, ['array', 'null'], '`args`');

    const source = useRef(resource);

    if (source.current !== resource) {
        throw new TypeError("usePriem: it looks like you've passed a different 'source' value after initializing.");
    }

    const componentRef = useRef(null);
    const shouldForceUpdate = useRef(false);
    const dummyState = useState();

    componentRef.current = (prevArgs, forceUpdate) => {
        if (prevArgs !== null && args !== null && areKeysEqual(args, prevArgs)) {
            shouldForceUpdate.current = forceUpdate;
            dummyState[1]();
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
            dummyState[1]();
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
