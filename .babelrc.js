const env = process.env.BABEL_ENV || process.env.NODE_ENV;

const presets = ['@babel/preset-react', '@babel/preset-stage-3'];
const plugins = [];

if (env === 'test') {
    presets.unshift([
        '@babel/preset-env',
        {
            targets: {node: 'current'},
        }
    ]);
}

if (env === 'production') {
    presets.unshift([
        '@babel/preset-env',
        {
            targets: {node: 6, browsers: ['> 1%']},
            modules: false
        }
    ]);
}

module.exports = {presets, plugins};
