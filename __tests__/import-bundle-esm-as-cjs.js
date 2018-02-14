const {Priem, PriemProvider, propTypes} = require('../dist/priem.esm');

describe('import-bundle-esm-as-cjs', () => {
    it('should export properly', () => {
        expect(typeof Priem).toBe('function');
        expect(typeof PriemProvider).toBe('function');
        expect(typeof propTypes).toBe('object');
    });
});
