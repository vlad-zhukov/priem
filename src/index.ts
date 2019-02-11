export {default as createResource} from './createResource';
export {populateStore, flushStore} from './Resource';

import {renderPromises} from './Resource';

/** @internal */
export const __INTERNALS__ = {
    renderPromises,
};
