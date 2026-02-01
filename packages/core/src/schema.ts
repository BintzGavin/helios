import { HeliosError, HeliosErrorCode } from './errors.js';
import { parseColor } from './color.js';

export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'color'
  | 'image'
  | 'video'
  | 'audio'
  | 'font'
  | 'model'
  | 'json'
  | 'shader'
  | 'int8array'
  | 'uint8array'
  | 'uint8clampedarray'
  | 'int16array'
  | 'uint16array'
  | 'int32array'
  | 'uint32array'
  | 'float32array'
  | 'float64array';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
  step?: number;
  format?: string;
  pattern?: string;
  accept?: string[];
  group?: string;
  items?: PropDefinition;
  properties?: HeliosSchema;
}

export type HeliosSchema = Record<string, PropDefinition>;

export function validateSchema(schema: HeliosSchema | undefined, parentKey = ''): void {
  if (!schema) return;

  for (const [key, def] of Object.entries(schema)) {
    const path = parentKey ? `${parentKey}.${key}` : key;

    // Validate Pattern constraint
    if (def.pattern !== undefined) {
      if (def.type !== 'string') {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' defines pattern but is not a string type.`);
      }
      try {
        new RegExp(def.pattern);
      } catch (e) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' defines invalid pattern regex: ${def.pattern}`);
      }
    }

    // Validate Accept constraint
    if (def.accept !== undefined) {
      if (def.type !== 'string' && !['image', 'video', 'audio', 'font', 'model', 'json', 'shader'].includes(def.type)) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' defines accept but is not a string or asset type.`);
      }
      if (!Array.isArray(def.accept)) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' accept must be an array of strings.`);
      }
      if (def.accept.some(ext => typeof ext !== 'string')) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' accept must contain only strings.`);
      }
    }

    // Validate Array/TypedArray constraints
    if (def.minItems !== undefined || def.maxItems !== undefined) {
      const isArray = def.type === 'array' || def.type.endsWith('array');
      if (!isArray) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' defines minItems/maxItems but is not an array type.`);
      }
      if (def.minItems !== undefined && def.minItems < 0) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' minItems must be non-negative.`);
      }
      if (def.maxItems !== undefined && def.maxItems < 0) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' maxItems must be non-negative.`);
      }
      if (def.minItems !== undefined && def.maxItems !== undefined && def.minItems > def.maxItems) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' minItems cannot be greater than maxItems.`);
      }
    }

    // Validate String constraints
    if (def.minLength !== undefined || def.maxLength !== undefined) {
      if (def.type !== 'string') {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' defines minLength/maxLength but is not a string type.`);
      }
      if (def.minLength !== undefined && def.minLength < 0) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' minLength must be non-negative.`);
      }
      if (def.maxLength !== undefined && def.maxLength < 0) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' maxLength must be non-negative.`);
      }
      if (def.minLength !== undefined && def.maxLength !== undefined && def.minLength > def.maxLength) {
        throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Prop '${path}' minLength cannot be greater than maxLength.`);
      }
    }

    // Validate default value if present
    if (def.default !== undefined) {
      try {
        validateValue(def.default, def, path);
      } catch (e: any) {
        // Wrap error to indicate it's a schema definition issue
        const message = e.message || String(e);
        // Strip "Invalid type for prop 'path'. " prefix if present to avoid redundancy
        const cleanMessage = message.replace(/^Invalid type for prop '.*'\.\s*/, '');
        throw new HeliosError(
          HeliosErrorCode.INVALID_SCHEMA,
          `Schema default for '${path}' is invalid: ${cleanMessage}`
        );
      }
    }

    // Recurse for array items with properties (array of objects)
    if (def.type === 'array' && def.items && def.items.properties) {
      validateSchema(def.items.properties, `${path}[]`);
    }

    // Recurse for object properties
    if (def.type === 'object' && def.properties) {
      validateSchema(def.properties, path);
    }
  }
}

export function validateProps<T = Record<string, any>>(props: T, schema?: HeliosSchema): T {
  if (!schema) return props;

  const validProps: Record<string, any> = {};

  for (const [key, def] of Object.entries(schema)) {
    const val = (props as any)[key];

    // Check requirement
    if (val === undefined) {
      if (def.default !== undefined) {
        validProps[key] = def.default;
        continue;
      }
      if (!def.optional) {
        throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Missing required prop: ${key}`);
      }
      continue;
    }

    // Validate value
    validProps[key] = validateValue(val, def, key);
  }

  // Preserve extra props that are not in schema
  for (const key of Object.keys(props as any)) {
    if (!(key in schema)) {
      validProps[key] = (props as any)[key];
    }
  }

  return validProps as T;
}

function validateValue(val: any, def: PropDefinition, keyPath: string): any {
  // Check type
  if (def.type === 'string' && typeof val !== 'string') throwError(keyPath, 'string');
  if (def.type === 'number' && typeof val !== 'number') throwError(keyPath, 'number');
  if (def.type === 'boolean' && typeof val !== 'boolean') throwError(keyPath, 'boolean');
  if (def.type === 'array' && !Array.isArray(val)) throwError(keyPath, 'array');
  if (def.type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) throwError(keyPath, 'object');

  // Typed Arrays
  if (def.type === 'int8array' && !(val instanceof Int8Array)) throwError(keyPath, 'Int8Array');
  if (def.type === 'uint8array' && !(val instanceof Uint8Array)) throwError(keyPath, 'Uint8Array');
  if (def.type === 'uint8clampedarray' && !(val instanceof Uint8ClampedArray)) throwError(keyPath, 'Uint8ClampedArray');
  if (def.type === 'int16array' && !(val instanceof Int16Array)) throwError(keyPath, 'Int16Array');
  if (def.type === 'uint16array' && !(val instanceof Uint16Array)) throwError(keyPath, 'Uint16Array');
  if (def.type === 'int32array' && !(val instanceof Int32Array)) throwError(keyPath, 'Int32Array');
  if (def.type === 'uint32array' && !(val instanceof Uint32Array)) throwError(keyPath, 'Uint32Array');
  if (def.type === 'float32array' && !(val instanceof Float32Array)) throwError(keyPath, 'Float32Array');
  if (def.type === 'float64array' && !(val instanceof Float64Array)) throwError(keyPath, 'Float64Array');

  // Color and Assets are treated as strings for runtime check
  if (
    ['color', 'image', 'video', 'audio', 'font', 'model', 'json', 'shader'].includes(def.type) &&
    typeof val !== 'string'
  ) {
    throwError(keyPath, `${def.type} (string)`);
  }

  // String Length Check
  if (def.type === 'string' && typeof val === 'string') {
    if (def.minLength !== undefined && val.length < def.minLength) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must be at least ${def.minLength} characters.`);
    }
    if (def.maxLength !== undefined && val.length > def.maxLength) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must be at most ${def.maxLength} characters.`);
    }
    if (def.pattern !== undefined) {
      const regex = new RegExp(def.pattern);
      if (!regex.test(val)) {
        throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' does not match pattern: ${def.pattern}`);
      }
    }
  }

  // Accept Check (String/Assets)
  if (typeof val === 'string' && def.accept !== undefined) {
    const match = def.accept.some(ext => val.toLowerCase().endsWith(ext.toLowerCase()));
    if (!match) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must have one of these extensions: ${def.accept.join(', ')}`);
    }
  }

  // Array/TypedArray Length Check
  const isArray = def.type === 'array' || def.type.endsWith('array');
  if (isArray) {
    // Array.isArray or TypedArray check passed above, so we can access .lengthSafely
    // TypedArrays have a .length property just like arrays
    const len = (val as { length: number }).length;
    if (def.minItems !== undefined && len < def.minItems) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must have at least ${def.minItems} items.`);
    }
    if (def.maxItems !== undefined && len > def.maxItems) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must have at most ${def.maxItems} items.`);
    }
  }

  // Color Format Check
  if (def.type === 'color' && typeof val === 'string') {
      try {
        parseColor(val);
      } catch (e) {
         // Re-throw with keyPath context if it's a HeliosError, or create new one
         throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Invalid color format for prop '${keyPath}': ${val}`);
      }
  }

  // Enum Check
  if (def.enum && !def.enum.includes(val)) {
    throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must be one of: ${def.enum.join(', ')}`);
  }

  // Range Check (Number only)
  if (typeof val === 'number') {
    if (def.minimum !== undefined && val < def.minimum) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must be >= ${def.minimum}`);
    }
    if (def.maximum !== undefined && val > def.maximum) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${keyPath}' must be <= ${def.maximum}`);
    }
  }

  // Recursive Array Validation
  if (def.type === 'array' && def.items && Array.isArray(val)) {
    return val.map((item, index) => validateValue(item, def.items!, `${keyPath}[${index}]`));
  }

  // Recursive Object Validation
  if (def.type === 'object' && def.properties && typeof val === 'object' && val !== null) {
      const validObj: Record<string, any> = {};

      for(const [propKey, propDef] of Object.entries(def.properties)) {
          const propVal = val[propKey];
           if (propVal === undefined) {
                if (propDef.default !== undefined) {
                    validObj[propKey] = propDef.default;
                    continue;
                }
                if (!propDef.optional) {
                    throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Missing required prop: ${keyPath}.${propKey}`);
                }
                continue;
            }
            validObj[propKey] = validateValue(propVal, propDef, `${keyPath}.${propKey}`);
      }

      // Preserve extra props in nested object
      for (const key of Object.keys(val)) {
        if (!(key in def.properties)) {
            validObj[key] = val[key];
        }
      }
      return validObj;
  }

  return val;
}

function throwError(key: string, expected: string): never {
  throw new HeliosError(
    HeliosErrorCode.INVALID_INPUT_PROPS,
    `Invalid type for prop '${key}'. Expected ${expected}.`
  );
}
