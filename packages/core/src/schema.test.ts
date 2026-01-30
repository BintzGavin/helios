import { describe, it, expect } from 'vitest';
import { validateProps, validateSchema } from './schema.js';
import { HeliosError, HeliosErrorCode } from './errors.js';

describe('validateSchema', () => {
  it('should pass if schema defaults are valid', () => {
    const schema = {
      name: { type: 'string' as const, default: 'Alice' },
      age: { type: 'number' as const, default: 30 },
      isActive: { type: 'boolean' as const, default: true }
    };
    expect(() => validateSchema(schema)).not.toThrow();
  });

  it('should throw INVALID_SCHEMA if default value type is wrong', () => {
    const schema = {
      age: { type: 'number' as const, default: '30' } // String instead of number
    };
    expect(() => validateSchema(schema)).toThrow(HeliosError);
    try {
      validateSchema(schema);
    } catch (e: any) {
      expect(e.code).toBe(HeliosErrorCode.INVALID_SCHEMA);
      expect(e.message).toContain("Schema default for 'age' is invalid");
      expect(e.message).toContain("Expected number");
    }
  });

  it('should validate defaults in nested objects', () => {
    const schema = {
      config: {
        type: 'object' as const,
        properties: {
          retry: { type: 'number' as const, default: 'infinite' } // Invalid
        }
      }
    };
    expect(() => validateSchema(schema)).toThrow(HeliosError);
    try {
      validateSchema(schema);
    } catch (e: any) {
      expect(e.code).toBe(HeliosErrorCode.INVALID_SCHEMA);
      expect(e.message).toContain("Schema default for 'config.retry' is invalid");
    }
  });

  it('should validate defaults in nested arrays', () => {
      // Note: Array items typically don't have 'default' in this way unless we support default values for items?
      // But validateSchema recurses into items.properties for array of objects.
      // Let's test properties inside array items.
      const schema = {
        users: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              age: { type: 'number' as const, default: 'unknown' } // Invalid
            }
          }
        }
      };
      expect(() => validateSchema(schema)).toThrow(HeliosError);
      try {
        validateSchema(schema);
      } catch (e: any) {
        expect(e.code).toBe(HeliosErrorCode.INVALID_SCHEMA);
        expect(e.message).toContain("Schema default for 'users[].age' is invalid");
      }
  });

  it('should validate enum defaults', () => {
    const schema = {
      role: { type: 'string' as const, enum: ['admin', 'user'], default: 'guest' } // 'guest' not in enum
    };
    expect(() => validateSchema(schema)).toThrow(HeliosError);
    try {
      validateSchema(schema);
    } catch (e: any) {
      expect(e.code).toBe(HeliosErrorCode.INVALID_SCHEMA);
      expect(e.message).toContain("must be one of: admin, user");
    }
  });

  it('should validate numeric range defaults', () => {
    const schema = {
      score: { type: 'number' as const, minimum: 0, default: -1 }
    };
    expect(() => validateSchema(schema)).toThrow(HeliosError);
    try {
      validateSchema(schema);
    } catch (e: any) {
      expect(e.code).toBe(HeliosErrorCode.INVALID_SCHEMA);
      expect(e.message).toContain("must be >= 0");
    }
  });

  it('should validate color defaults', () => {
    const schema = {
      color: { type: 'color' as const, default: 'invalid-color' }
    };
    expect(() => validateSchema(schema)).toThrow(HeliosError);
    try {
      validateSchema(schema);
    } catch (e: any) {
      expect(e.code).toBe(HeliosErrorCode.INVALID_SCHEMA);
      expect(e.message).toContain("Invalid color format");
    }
  });
});

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

  it('should accept UI hint fields (step, format)', () => {
    const schema = {
      opacity: {
        type: 'number' as const,
        minimum: 0,
        maximum: 1,
        step: 0.1,
        label: 'Opacity'
      },
      description: {
        type: 'string' as const,
        format: 'multiline',
        label: 'Description'
      }
    };

    const props = { opacity: 0.5, description: 'Line 1\nLine 2' };
    expect(validateProps(props, schema)).toEqual(props);
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

  it('should validate new asset types (model, json, shader)', () => {
    const schema = {
      mdl: { type: 'model' as const },
      dat: { type: 'json' as const },
      shd: { type: 'shader' as const },
    };
    const valid = {
      mdl: 'path/to/model.glb',
      dat: 'path/to/data.json',
      shd: 'path/to/shader.glsl',
    };
    expect(validateProps(valid, schema)).toEqual(valid);

    expect(() => validateProps({ mdl: 123 }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ dat: {} }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ shd: true }, schema)).toThrow(HeliosError);
  });

  it('should validate color formats', () => {
    const schema = {
        col: { type: 'color' as const }
    };

    // Valid formats
    expect(validateProps({ col: '#f00' }, schema)).toEqual({ col: '#f00' });
    expect(validateProps({ col: '#ff0000' }, schema)).toEqual({ col: '#ff0000' });
    expect(validateProps({ col: 'rgb(255, 0, 0)' }, schema)).toEqual({ col: 'rgb(255, 0, 0)' });
    expect(validateProps({ col: 'hsl(0, 100%, 50%)' }, schema)).toEqual({ col: 'hsl(0, 100%, 50%)' });

    // Invalid formats
    expect(() => validateProps({ col: '#gg' }, schema)).toThrow(HeliosError); // Invalid hex
    expect(() => validateProps({ col: 'red' }, schema)).toThrow(HeliosError); // Named colors not supported yet
    expect(() => validateProps({ col: '123' }, schema)).toThrow(HeliosError); // Just numbers
    expect(() => validateProps({ col: 123 }, schema)).toThrow(HeliosError); // Wrong type
  });

  it('should validate array items', () => {
    const schema = {
      tags: {
        type: 'array' as const,
        items: { type: 'string' as const }
      }
    };
    expect(validateProps({ tags: ['a', 'b'] }, schema)).toEqual({ tags: ['a', 'b'] });
    expect(() => validateProps({ tags: ['a', 123] }, schema)).toThrow(HeliosError);
    expect(() => validateProps({ tags: ['a', 123] }, schema)).toThrow(/Invalid type for prop 'tags\[1\]'. Expected string/);
  });

  it('should validate array of objects', () => {
    const schema = {
      users: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            age: { type: 'number' as const }
          }
        }
      }
    };
    const valid = { users: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }] };
    expect(validateProps(valid, schema)).toEqual(valid);

    expect(() => validateProps({ users: [{ name: 'Alice' }] }, schema)).toThrow(/Missing required prop: users\[0\].age/);
  });

  it('should validate nested objects', () => {
    const schema = {
      config: {
        type: 'object' as const,
        properties: {
          theme: { type: 'string' as const, enum: ['dark', 'light'] },
          retry: { type: 'number' as const, default: 3 }
        }
      }
    };

    expect(validateProps({ config: { theme: 'dark' } }, schema)).toEqual({ config: { theme: 'dark', retry: 3 } });
    expect(() => validateProps({ config: { theme: 'blue' } }, schema)).toThrow(/Prop 'config.theme' must be one of: dark, light/);
  });

  it('should handle deep nesting', () => {
      const schema = {
          level1: {
              type: 'object' as const,
              properties: {
                  level2: {
                      type: 'array' as const,
                      items: {
                          type: 'object' as const,
                          properties: {
                              val: { type: 'number' as const, minimum: 0 }
                          }
                      }
                  }
              }
          }
      };

      const valid = { level1: { level2: [{ val: 10 }, { val: 0 }] } };
      expect(validateProps(valid, schema)).toEqual(valid);

      expect(() => validateProps({ level1: { level2: [{ val: -1 }] } }, schema)).toThrow(/Prop 'level1.level2\[0\].val' must be >= 0/);
  });
});
