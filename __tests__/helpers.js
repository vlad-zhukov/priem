import delay from 'delay';
import {type, assertType, debounce} from '../src/helpers';

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
        expect(() => assertType(null, ['object'])).toThrowErrorMatchingInlineSnapshot(
            `"Priem: The value must be one of the following: 'object', but got: 'null'."`
        );
        expect(() => assertType(NaN, ['number'])).toThrowErrorMatchingInlineSnapshot(
            `"Priem: The value must be one of the following: 'number', but got: 'NaN'."`
        );
        expect(() => assertType('foo', ['number', 'function'])).toThrowErrorMatchingInlineSnapshot(
            `"Priem: The value must be one of the following: 'number, function', but got: 'string'."`
        );
        expect(() => assertType({}, ['number'], "'myProps'")).toThrowErrorMatchingInlineSnapshot(
            `"Priem: 'myProps' must be one of the following: 'number', but got: 'object'."`
        );
    });

    it('should not throw if type is correct', () => {
        expect(() => assertType(null, ['null'])).not.toThrow();
        expect(() => assertType('foo', ['string'])).not.toThrow();
        expect(() => assertType(NaN, ['NaN'])).not.toThrow();
        expect(() => assertType({}, ['object'], "'myProps'")).not.toThrow();
    });
});

describe('debounce', () => {
    it('should debounce function calls', async () => {
        const func = jest.fn();
        const debouncedFunc = debounce(func, 300);

        debouncedFunc();
        debouncedFunc();

        expect(func).toHaveBeenCalledTimes(0);

        await delay(400);
        expect(func).toHaveBeenCalledTimes(1);
    });
});
