import {useRef, useState, useMemo, useEffect} from 'react';
import {areKeysEqual, PENDING, FULFILLED, REJECTED} from './memoize';
import {assertType} from './helpers';

function usePriem(container, args) {
    assertType(args, ['array', 'null'], '`args`');

    const source = useRef(container);

    if (source.current !== container) {
        // throw error!
    }

    const componentRef = useRef(null);
    const shouldForceUpdate = useRef(false);
    const dummyState = useState(null);

    useMemo(() => {
        componentRef.current = (prevArgs, forceUpdate) => {
            console.log(prevArgs, args);
            if (prevArgs !== null && areKeysEqual(args, prevArgs)) {
                shouldForceUpdate.current = forceUpdate;
                dummyState[1](null);
            }
        };
    }, args);

    useEffect(() => {
        source.current._subscribe(componentRef);
        return () => source.current._unsubscribe(componentRef);
    }, []);

    const forceUpdate = shouldForceUpdate.current;
    shouldForceUpdate.current = false;

    const result = source.current._get(args, forceUpdate);

    return {
        data: result.data,
        pending: result.status === PENDING,
        fulfilled: result.status === FULFILLED,
        rejected: result.status === REJECTED,
        reason: result.reason,
        refresh() {
            shouldForceUpdate.current = true;
            dummyState[1](null);
        },
    };
}

export default usePriem;
