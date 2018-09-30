const env = process.env.BABEL_ENV || process.env.NODE_ENV;

const presets = ['@babel/preset-react'];
const plugins = [];

if (env === 'test') {
    presets.unshift([
        '@babel/preset-env',
        {
            targets: {node: 'current'},
        },
    ]);
    plugins.push(['@babel/plugin-proposal-decorators', {legacy: true}]);
}

if (env === 'production') {
    presets.unshift([
        '@babel/preset-env',
        {
            targets: {node: '8'},
            modules: false,
            loose: true,
        },
    ]);
}

module.exports = {presets, plugins};
