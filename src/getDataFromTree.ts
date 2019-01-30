import {ReactElement} from 'react';
// tslint:disable-next-line no-submodule-imports
import * as ReactDOM from 'react-dom/server';
import {renderPromises} from './Resource';

export default async function getDataFromTree(tree: ReactElement<any>): Promise<void> {
    while (true) {
        ReactDOM.renderToStaticMarkup(tree);
        if (renderPromises.length === 0) {
            return;
        }
        const promises = renderPromises.splice(0);
        await Promise.all(promises);
    }
}
