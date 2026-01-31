# P-2026-05-29-STUDIO-TypedArray-Support

#### 1. Context & Goal
- **Objective**: Implement support for `TypedArray` props (e.g., `float32array`, `int8array`) in the Studio Props Editor.
- **Trigger**: The current implementation in `SchemaInputs.tsx` renders "Unsupported schema type" for valid Core schema types, creating a gap in the "Props Editor" vision.
- **Impact**: Enables users to view and edit binary data props (like audio buffers or geometry) without UI errors, ensuring 100% Core schema coverage.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx` (Add TypedArray handling and `TypedArrayInput` component)
- **Modify**: `packages/studio/src/components/PropsEditor.test.tsx` (Add tests for TypedArray rendering)
- **Read-Only**: `packages/core/src/schema.ts` (Reference for `PropType` definitions)

#### 3. Implementation Spec
- **Architecture**:
  - Extend the switch case in `SchemaInput` to handle all 9 `TypedArray` types defined in `PropType` (`int8array`, `uint8array`, `uint8clampedarray`, `int16array`, `uint16array`, `int32array`, `uint32array`, `float32array`, `float64array`).
  - Implement a `TypedArrayInput` component within `SchemaInputs.tsx`.
  - The `TypedArrayInput` will use `JsonInput` as the underlying editor to handle large arrays efficiently compared to thousands of number inputs.
- **Pseudo-Code**:
  ```typescript
  // In SchemaInputs.tsx

  // Map type string to Constructor
  const getTypedArrayConstructor = (type: string) => {
    switch(type) {
      case 'float32array': return Float32Array;
      case 'int8array': return Int8Array;
      case 'uint8array': return Uint8Array;
      case 'uint8clampedarray': return Uint8ClampedArray;
      case 'int16array': return Int16Array;
      case 'uint16array': return Uint16Array;
      case 'int32array': return Int32Array;
      case 'uint32array': return Uint32Array;
      case 'float64array': return Float64Array;
      default: return Float32Array;
    }
  };

  const TypedArrayInput = ({ type, value, onChange }) => {
    // Convert TypedArray to standard Array for friendly JSON editing (e.g. [1, 2] instead of {"0":1})
    // value is expected to be a TypedArray instance
    const arrayValue = Array.from(value || []);

    const handleChange = (newJsonValue) => {
      if (!Array.isArray(newJsonValue)) return; // Logic to reject non-arrays
      const Constructor = getTypedArrayConstructor(type);
      onChange(new Constructor(newJsonValue));
    };

    return <JsonInput value={arrayValue} onChange={handleChange} />;
  }

  // In SchemaInput switch:
  case 'int8array':
  case 'uint8array':
  case 'uint8clampedarray':
  case 'int16array':
  case 'uint16array':
  case 'int32array':
  case 'uint32array':
  case 'float32array':
  case 'float64array':
    return <TypedArrayInput type={type} value={value} onChange={onChange} />;
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/studio` to execute `PropsEditor.test.tsx`.
- **Success Criteria**:
  - New test case in `PropsEditor.test.tsx` renders a `Float32Array` prop.
  - The rendered input shows `[1, 2, 3]` (array format).
  - Updating the input triggers the `onChange` handler with a `Float32Array` instance containing the new values.
- **Edge Cases**:
  - `null` or `undefined` value (should default to empty array).
  - Invalid JSON (handled by `JsonInput` error state).
