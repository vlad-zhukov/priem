import ReactDOM from 'react-dom/server';
import {renderPromises} from './Container';

export default async function getDataFromTree(tree) {
    while (true) {
        ReactDOM.renderToStaticMarkup(tree);
        if (renderPromises.length === 0) {
            return;
        }
        const promises = renderPromises.splice(0);
        await Promise.all(promises);
    }
}
