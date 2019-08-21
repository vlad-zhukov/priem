const {getRunningPromises} = require('./');

const ReactDOM = require('react-dom/server');

async function getDataFromTree(tree) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        ReactDOM.renderToStaticMarkup(tree);
        const promises = getRunningPromises();
        if (promises.length === 0) {
            return;
        }
        await Promise.all(promises);
    }
}

module.exports = {getDataFromTree};
