module.exports = {
    testRunner: 'jest-circus/runner',
    globals: {
        'ts-jest': {
            tsConfig: 'tsconfig.test.json',
        },
    },
    transform: {
        '.tsx?$': 'ts-jest',
        '.js$': 'babel-jest',
    },
    setupFilesAfterEnv: ['raf/polyfill'],
    roots: ['<rootDir>/src'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*'],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
};
