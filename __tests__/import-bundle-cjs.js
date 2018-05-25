const priem = require('../dist/priem.cjs');

describe('import-bundle-cjs', () => {
    it('should export properly', () => {
        expect(typeof priem.Priem).toBe('function');
        expect(typeof priem.createStore).toBe('function');
        expect(typeof priem.withPriem).toBe('function');
        expect(typeof priem.getDataFromTree).toBe('function');
        expect(typeof priem.promiseState).toBe('object');
        expect(typeof priem.promiseState.isPromiseState).toBe('function');
        expect(typeof priem.promiseState.isLoading).toBe('function');
    });
});
