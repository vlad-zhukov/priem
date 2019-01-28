import {ReactElement} from 'react';
import * as ReactDOM from 'react-dom/server';
import {renderPromises} from './Resource';

export default async function getDataFromTree(tree: ReactElement<any>) {
    while (true) {
        ReactDOM.renderToStaticMarkup(tree);
        if (renderPromises.length === 0) {
            return;
        }
        const promises = renderPromises.splice(0);
        await Promise.all(promises); // eslint-disable-line no-await-in-loop
    }
}
