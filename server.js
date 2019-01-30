const {__INTERNALS__} = require('.');
const createGetDataFromTree = require('./dist/priem.server');

module.exports = {
    getDataFromTree: createGetDataFromTree(__INTERNALS__.renderPromises),
};
