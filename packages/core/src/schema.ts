import { HeliosError, HeliosErrorCode } from './errors';

export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'color';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
}

export type HeliosSchema = Record<string, PropDefinition>;

export function validateProps(props: Record<string, any>, schema?: HeliosSchema): Record<string, any> {
  if (!schema) return props;

  const validProps = { ...props };

  for (const [key, def] of Object.entries(schema)) {
    const val = validProps[key];

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

    // Check type
    if (def.type === 'string' && typeof val !== 'string') throwError(key, 'string');
    if (def.type === 'number' && typeof val !== 'number') throwError(key, 'number');
    if (def.type === 'boolean' && typeof val !== 'boolean') throwError(key, 'boolean');
    if (def.type === 'array' && !Array.isArray(val)) throwError(key, 'array');
    if (def.type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) throwError(key, 'object');
    // Color is treated as string for runtime check
    if (def.type === 'color' && typeof val !== 'string') throwError(key, 'color (string)');

    // Enum Check
    if (def.enum && !def.enum.includes(val)) {
      throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${key}' must be one of: ${def.enum.join(', ')}`);
    }

    // Range Check (Number only)
    if (typeof val === 'number') {
      if (def.minimum !== undefined && val < def.minimum) {
        throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${key}' must be >= ${def.minimum}`);
      }
      if (def.maximum !== undefined && val > def.maximum) {
        throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${key}' must be <= ${def.maximum}`);
      }
    }
  }

  return validProps;
}

function throwError(key: string, expected: string): never {
  throw new HeliosError(
    HeliosErrorCode.INVALID_INPUT_PROPS,
    `Invalid type for prop '${key}'. Expected ${expected}.`
  );
}
