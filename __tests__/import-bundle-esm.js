import {Priem, PriemProvider, propTypes} from '../dist/redux-status.esm';

describe('import-bundle-esm', () => {
    it('should export properly', () => {
        expect(typeof Priem).toBe('function');
        expect(typeof PriemProvider).toBe('function');
        expect(typeof propTypes).toBe('object');
    });
});
