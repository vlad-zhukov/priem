export {default as usePriem} from './usePriem';
export {Resource, populateStore, flushStore} from './Resource';

import {renderPromises} from './Resource';

/** @internal */
export const __INTERNALS__ = {
    renderPromises,
};
