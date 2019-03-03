const path = require('path');
const fs = require('fs-extra');
const {rollup} = require('rollup');
const typescript = require('rollup-plugin-typescript2');
const {Extractor} = require('@microsoft/api-extractor');
const pkg = require('./package');

const cwd = process.cwd();
const dist = path.resolve(cwd, 'dist/');

function getPlugins(tsconfigOverride = {}) {
    return [
        typescript({
            tsconfigOverride,
            include: ['src/**/*'],
            cacheRoot: path.resolve(cwd, 'node_modules/.rts2_cache'),
            useTsconfigDeclarationDir: true,
        }),
    ];
}

const external = Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies), 'react-dom/server', '..');

async function build() {
    console.info('Cleaning dist/');
    await fs.emptyDir(dist);

    console.info('Compiling a client-side bundle');
    const clientBundle = await rollup({
        input: './src/index.ts',
        plugins: getPlugins(),
        external,
    });
    await clientBundle.write({
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
    });
    await clientBundle.write({
        file: pkg.module,
        format: 'es',
        sourcemap: true,
    });

    console.info('Bundling client-side types');
    const extractorConfig = {
        compiler: {
            configType: 'tsconfig',
            rootFolder: cwd,
        },
        project: {
            entryPointSourceFile: path.resolve(dist, 'types/index.d.ts'),
        },
        validationRules: {
            missingReleaseTags: 'allow',
        },
        apiReviewFile: {
            enabled: false,
        },
        apiJsonFile: {
            enabled: false,
        },
        dtsRollup: {
            enabled: true,
            trimming: true,
            publishFolderForPublic: './',
            mainDtsRollupPath: 'priem.d.ts',
        },
        tsdocMetadata: {
            enabled: false,
        }
    };

    const extractor = new Extractor(extractorConfig);
    extractor.processProject();

    await Promise.all([
        fs.remove(path.resolve(dist, 'beta')),
        fs.remove(path.resolve(dist, 'internal')),
        fs.remove(path.resolve(dist, 'tsdoc-metadata.json')),
    ]);

    console.info('Compiling a server-side bundle');
    const serverBundle = await rollup({
        input: './src/index.server.ts',
        plugins: getPlugins({compilerOptions: {target: 'es2017'}}),
        external,
    });
    await serverBundle.write({
        file: './dist/priem.server.js',
        format: 'cjs',
        sourcemap: true,
    });

    await fs.remove(path.resolve(dist, 'types'));
}

(async () => {
    try {
        await build();
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    }
})();
