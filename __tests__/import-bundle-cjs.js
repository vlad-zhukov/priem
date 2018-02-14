const {Priem, PriemProvider, propTypes} = require('../dist/priem.cjs');

describe('import-bundle-cjs', () => {
    it('should export properly', () => {
        expect(typeof Priem).toBe('function');
        expect(typeof PriemProvider).toBe('function');
        expect(typeof propTypes).toBe('object');
    });
});
