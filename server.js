const createGetDataFromTree = require('./dist/priem.server');
const {getRunningPromises} = require('./');

module.exports = {getDataFromTree: createGetDataFromTree(getRunningPromises)};
