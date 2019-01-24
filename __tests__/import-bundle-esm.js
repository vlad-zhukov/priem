import * as priem from '../dist/priem.esm';

describe('import-bundle-esm', () => {
    it('should export properly', () => {
        expect(typeof priem.usePriem).toBe('function');
        expect(typeof priem.Resource).toBe('function');
        expect(typeof priem.populateStore).toBe('function');
        expect(typeof priem.flushStore).toBe('function');
        expect(typeof priem.getDataFromTree).toBe('function');
    });
});
