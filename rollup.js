const path = require('path');
const rollup = require('rollup');
const typescript = require('rollup-plugin-typescript2');
const pkg = require('./package');

const cacheRoot = path.resolve(process.cwd(), 'node_modules/.rts2_cache');
const plugins = [typescript({include: ['src/**/*'], cacheRoot})];
const external = Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies), 'react-dom/server');

rollup
    .rollup({
        input: './src/index.ts',
        plugins,
        external,
    })
    .then(bundle => {
        bundle.write({
            file: pkg.main,
            format: 'cjs',
            sourcemap: true,
        });
        bundle.write({
            file: pkg.module,
            format: 'es',
            sourcemap: true,
        });
    })
    .catch(e => {
        console.log(e);
    });

rollup
    .rollup({
        input: './src/index.server.ts',
        plugins,
        external,
    })
    .then(bundle => {
        bundle.write({
            file: './dist/priem.server.js',
            format: 'cjs',
            sourcemap: true,
        });
    })
    .catch(e => {
        console.log(e);
    });
