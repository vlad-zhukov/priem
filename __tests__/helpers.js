import {type} from '../src/helpers';

it('should determine types of values', () => {
    expect(type(undefined)).toBe('undefined');
    expect(type(null)).toBe('null');
    expect(type(123)).toBe('number');
    expect(type('foo')).toBe('string');
    expect(type(true)).toBe('boolean');
    expect(type([])).toBe('array');
    expect(type({})).toBe('object');
    expect(type(() => {})).toBe('function');
});
