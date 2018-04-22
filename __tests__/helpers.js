import {type, assertType} from '../src/helpers';

describe('type', () => {
    it('should return types of values', () => {
        expect(type(NaN)).toBe('NaN');
        expect(type(undefined)).toBe('undefined');
        expect(type(null)).toBe('null');
        expect(type(123)).toBe('number');
        expect(type('foo')).toBe('string');
        expect(type(true)).toBe('boolean');
        expect(type([])).toBe('array');
        expect(type({})).toBe('object');
        expect(type(() => {})).toBe('function');
    });
});

describe('assertType', () => {
    it('should throw if type is wrong', () => {
        expect(() => assertType(null, ['object'])).toThrowErrorMatchingSnapshot();
        expect(() => assertType(NaN, ['number'])).toThrowErrorMatchingSnapshot();
        expect(() => assertType('foo', ['number', 'function'])).toThrowErrorMatchingSnapshot();
        expect(() => assertType({}, ['number'], "'myProps'")).toThrowErrorMatchingSnapshot();
    });

    it('should not throw if type is correct', () => {
        expect(() => assertType(null, ['null'])).not.toThrow();
        expect(() => assertType('foo', ['string'])).not.toThrow();
        expect(() => assertType(NaN, ['NaN'])).not.toThrow();
        expect(() => assertType({}, ['object'], "'myProps'")).not.toThrow();
    });
});
