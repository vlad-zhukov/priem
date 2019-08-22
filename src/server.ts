import {ReactElement} from 'react';
import * as ReactDOM from 'react-dom/server';

export default function createGetDataFromTree(getRunningPromises: () => Promise<unknown>[]) {
    return async function getDataFromTree(tree: ReactElement) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            ReactDOM.renderToStaticMarkup(tree);
            const promises = getRunningPromises();
            if (promises.length === 0) {
                return;
            }
            await Promise.all(promises);
        }
    };
}
