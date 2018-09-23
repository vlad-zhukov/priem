import * as priem from '../dist/priem.esm';

describe('import-bundle-esm', () => {
    it('should export properly', () => {
        expect(typeof priem.Priem).toBe('function');
        expect(typeof priem.Container).toBe('function');
        expect(typeof priem.withPriem).toBe('function');
        // expect(typeof priem.getDataFromTree).toBe('function');
        expect(typeof priem.promiseState).toBe('object');
        expect(typeof priem.promiseState.isPromiseState).toBe('function');
        expect(typeof priem.promiseState.isLoading).toBe('function');
    });
});
