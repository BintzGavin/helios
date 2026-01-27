import { describe, it, expect } from 'vitest';
import { validateProps } from './schema';
import { HeliosError, HeliosErrorCode } from './errors';

describe('validateProps', () => {
  it('should return props as-is if no schema is provided', () => {
    const props = { foo: 'bar', baz: 123 };
    expect(validateProps(props)).toEqual(props);
  });

  it('should pass valid props', () => {
    const schema = {
      name: { type: 'string' as const },
      age: { type: 'number' as const },
      isActive: { type: 'boolean' as const }
    };
    const props = { name: 'Alice', age: 30, isActive: true };
    expect(validateProps(props, schema)).toEqual(props);
  });

  it('should throw if required prop is missing', () => {
    const schema = { required: { type: 'string' as const } };
    expect(() => validateProps({}, schema)).toThrow(HeliosError);
    expect(() => validateProps({}, schema)).toThrow(/Missing required prop: required/);
  });

  it('should apply default values for missing optional props', () => {
    const schema = {
      optionalWithDefault: { type: 'string' as const, optional: true, default: 'default' },
      requiredWithDefault: { type: 'number' as const, default: 42 }
    };
    const props = {};
    const result = validateProps(props, schema);
    expect(result).toEqual({ optionalWithDefault: 'default', requiredWithDefault: 42 });
  });

  it('should NOT apply default values if prop is present', () => {
     const schema = {
      val: { type: 'string' as const, default: 'default' }
    };
    expect(validateProps({ val: 'custom' }, schema)).toEqual({ val: 'custom' });
  });

  it('should allow missing optional props without default', () => {
    const schema = { opt: { type: 'string' as const, optional: true } };
    expect(validateProps({}, schema)).toEqual({});
  });

  it('should throw on type mismatch', () => {
    const schema = { str: { type: 'string' as const } };
    expect(() => validateProps({ str: 123 }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ str: 123 }, schema)).toThrow(/Invalid type for prop 'str'/);
  });

  it('should validate arrays', () => {
    const schema = { list: { type: 'array' as const } };
    expect(validateProps({ list: [1, 2] }, schema)).toEqual({ list: [1, 2] });
    expect(() => validateProps({ list: 'not-array' }, schema)).toThrow(HeliosError);
  });

  it('should validate objects', () => {
    const schema = { obj: { type: 'object' as const } };
    expect(validateProps({ obj: { a: 1 } }, schema)).toEqual({ obj: { a: 1 } });
    expect(() => validateProps({ obj: [1] }, schema)).toThrow(HeliosError); // Array is object but treated separately
    expect(() => validateProps({ obj: null }, schema)).toThrow(HeliosError);
  });

  it('should allow extra props', () => {
      const schema = { known: { type: 'string' as const } };
      const props = { known: 'yes', extra: 'allowed' };
      expect(validateProps(props, schema)).toEqual(props);
  });

  it('should validate enum values', () => {
    const schema = { choice: { type: 'string' as const, enum: ['A', 'B'] } };
    expect(validateProps({ choice: 'A' }, schema)).toEqual({ choice: 'A' });
    expect(() => validateProps({ choice: 'C' }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ choice: 'C' }, schema)).toThrow(/must be one of: A, B/);
  });

  it('should validate minimum value', () => {
    const schema = { val: { type: 'number' as const, minimum: 10 } };
    expect(validateProps({ val: 10 }, schema)).toEqual({ val: 10 });
    expect(validateProps({ val: 11 }, schema)).toEqual({ val: 11 });
    expect(() => validateProps({ val: 9 }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ val: 9 }, schema)).toThrow(/must be >= 10/);
  });

  it('should validate maximum value', () => {
    const schema = { val: { type: 'number' as const, maximum: 10 } };
    expect(validateProps({ val: 10 }, schema)).toEqual({ val: 10 });
    expect(validateProps({ val: 9 }, schema)).toEqual({ val: 9 });
    expect(() => validateProps({ val: 11 }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ val: 11 }, schema)).toThrow(/must be <= 10/);
  });

  it('should ignore metadata fields', () => {
    const schema = {
        val: {
            type: 'string' as const,
            label: 'My Value',
            description: 'A test value'
        }
    };
    expect(validateProps({ val: 'ok' }, schema)).toEqual({ val: 'ok' });
  });

  it('should validate asset types', () => {
    const schema = {
      img: { type: 'image' as const },
      vid: { type: 'video' as const },
      aud: { type: 'audio' as const },
      fnt: { type: 'font' as const },
    };
    const valid = {
      img: 'path/to/image.png',
      vid: 'path/to/video.mp4',
      aud: 'path/to/audio.mp3',
      fnt: 'path/to/font.ttf',
    };
    expect(validateProps(valid, schema)).toEqual(valid);

    expect(() => validateProps({ img: 123 }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ vid: {} }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ aud: true }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ fnt: [] }, schema)).toThrow(HeliosError);
  });
});
