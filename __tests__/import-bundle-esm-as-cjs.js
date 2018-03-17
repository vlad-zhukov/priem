const priem = require('../dist/priem.esm');

describe('import-bundle-esm-as-cjs', () => {
    it('should export properly', () => {
        expect(typeof priem.PriemProvider).toBe('function');
        expect(typeof priem.Priem).toBe('function');
        expect(typeof priem.withPriem).toBe('function');
        expect(typeof priem.getDataFromTree).toBe('function');
        expect(typeof priem.promiseState).toBe('object');
        expect(typeof priem.propTypes).toBe('object');
    });
});
