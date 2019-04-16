import {TypeName} from '@sindresorhus/is';
import {assertType} from '../utils';

describe('assertType', () => {
    it('should throw if type is wrong', () => {
        expect(() => assertType(null, [TypeName.Object])).toThrowErrorMatchingInlineSnapshot(
            `"Priem: The value must be one of the following: 'Object', but got: 'null'."`
        );
        expect(() => assertType('foo', [TypeName.number, TypeName.Function])).toThrowErrorMatchingInlineSnapshot(
            `"Priem: The value must be one of the following: 'number, Function', but got: 'string'."`
        );
        expect(() => assertType({}, [TypeName.number], "'myProps'")).toThrowErrorMatchingInlineSnapshot(
            `"Priem: 'myProps' must be one of the following: 'number', but got: 'Object'."`
        );
    });

    it('should not throw if type is correct', () => {
        expect(() => assertType(null, [TypeName.null])).not.toThrow();
        expect(() => assertType('foo', [TypeName.string])).not.toThrow();
        expect(() => assertType(NaN, [TypeName.number])).not.toThrow();
        expect(() => assertType({}, [TypeName.Object], "'myProps'")).not.toThrow();
    });
});
