const priem = require('../dist/priem.esm');

describe('import-bundle-esm-as-cjs', () => {
    it('should export properly', () => {
        expect(typeof priem.Priem).toBe('function');
        expect(typeof priem.Container).toBe('function');
        expect(typeof priem.populateStore).toBe('function');
        expect(typeof priem.flushStore).toBe('function');
        expect(typeof priem.getDataFromTree).toBe('function');
    });
});
