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
  | 'font';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
  step?: number;
  format?: string;
  items?: PropDefinition;
  properties?: HeliosSchema;
}

export type HeliosSchema = Record<string, PropDefinition>;

export function validateSchema(schema: HeliosSchema | undefined, parentKey = ''): void {
  if (!schema) return;

  for (const [key, def] of Object.entries(schema)) {
    const path = parentKey ? `${parentKey}.${key}` : key;

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

export function validateProps(props: Record<string, any>, schema?: HeliosSchema): Record<string, any> {
  if (!schema) return props;

  const validProps: Record<string, any> = {};

  for (const [key, def] of Object.entries(schema)) {
    const val = props[key];

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
  for (const key of Object.keys(props)) {
    if (!(key in schema)) {
      validProps[key] = props[key];
    }
  }

  return validProps;
}

function validateValue(val: any, def: PropDefinition, keyPath: string): any {
  // Check type
  if (def.type === 'string' && typeof val !== 'string') throwError(keyPath, 'string');
  if (def.type === 'number' && typeof val !== 'number') throwError(keyPath, 'number');
  if (def.type === 'boolean' && typeof val !== 'boolean') throwError(keyPath, 'boolean');
  if (def.type === 'array' && !Array.isArray(val)) throwError(keyPath, 'array');
  if (def.type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) throwError(keyPath, 'object');

  // Color and Assets are treated as strings for runtime check
  if (
    ['color', 'image', 'video', 'audio', 'font'].includes(def.type) &&
    typeof val !== 'string'
  ) {
    throwError(keyPath, `${def.type} (string)`);
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
