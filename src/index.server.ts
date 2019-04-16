import {ReactElement} from 'react';
import * as ReactDOM from 'react-dom/server';

export default function createGetDataFromTree(renderPromises: (Promise<unknown> | undefined)[]) {
    return async function getDataFromTree(tree: ReactElement<unknown>): Promise<void> {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            ReactDOM.renderToStaticMarkup(tree);
            if (renderPromises.length === 0) {
                return;
            }
            const promises = renderPromises.splice(0);
            await Promise.all(promises);
        }
    };
}
