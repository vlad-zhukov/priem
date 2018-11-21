import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
    input: './src/index.js',
    plugins: [babel()],
    external: Object.keys(pkg.peerDependencies),
    output: [
        {
            file: pkg.main,
            format: 'cjs',
            sourcemap: true,
        },
        {
            file: pkg.module,
            format: 'es',
            sourcemap: true,
        },
    ],
};
