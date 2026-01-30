#### 1. Context & Goal
- **Objective**: Implement Typed Array support in `HeliosSchema` and `validateProps` to enable high-performance data passing (WebGL buffers, Audio data) directly through input props.
- **Trigger**: Vision gap "Performance When It Matters" requiring efficient data transfer for WebCodecs/WebGL, and existing gap in `PropType` definitions where Typed Arrays are not explicitly supported.
- **Impact**: Unlocks direct passing of `Float32Array`, `Uint8Array`, etc., enabling advanced use cases like 3D model geometry manipulation and audio visualization without serialization overhead or loss of type safety.

#### 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add Typed Array types to `PropType` and validation logic)
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for Typed Array validation)
- **Read-Only**: `packages/core/src/errors.ts`

#### 3. Implementation Spec
- **Architecture**: Extend `PropType` union type and `validateValue` function in `schema.ts`.
- **Pseudo-Code**:
  ```typescript
  // 1. Extend PropType
  export type PropType =
    | ...
    | 'int8array'
    | 'uint8array'
    | 'uint8clampedarray'
    | 'int16array'
    | 'uint16array'
    | 'int32array'
    | 'uint32array'
    | 'float32array'
    | 'float64array';

  // 2. Update validateValue
  function validateValue(val: any, def: PropDefinition, keyPath: string): any {
    // ... existing basic type checks ...

    // Typed Array Checks
    if (def.type === 'int8array' && !(val instanceof Int8Array)) throwError(keyPath, 'Int8Array');
    if (def.type === 'uint8array' && !(val instanceof Uint8Array)) throwError(keyPath, 'Uint8Array');
    if (def.type === 'uint8clampedarray' && !(val instanceof Uint8ClampedArray)) throwError(keyPath, 'Uint8ClampedArray');
    if (def.type === 'int16array' && !(val instanceof Int16Array)) throwError(keyPath, 'Int16Array');
    if (def.type === 'uint16array' && !(val instanceof Uint16Array)) throwError(keyPath, 'Uint16Array');
    if (def.type === 'int32array' && !(val instanceof Int32Array)) throwError(keyPath, 'Int32Array');
    if (def.type === 'uint32array' && !(val instanceof Uint32Array)) throwError(keyPath, 'Uint32Array');
    if (def.type === 'float32array' && !(val instanceof Float32Array)) throwError(keyPath, 'Float32Array');
    if (def.type === 'float64array' && !(val instanceof Float64Array)) throwError(keyPath, 'Float64Array');

    // ... existing logic ...
    return val;
  }
  ```
- **Public API Changes**:
  - `PropType` expanded to include typed arrays.
  - `validateProps` will now enforce `instanceof` checks for these types.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - New tests in `packages/core/src/schema.test.ts` pass.
  - Test cases should cover:
    - Valid Typed Array input (e.g. `new Float32Array(...)` for `float32array`).
    - Invalid input (e.g. `[]` regular array, `null`, wrong Typed Array type).
    - Validation of defaults in schema definition.
- **Edge Cases**:
  - Ensuring `Array.isArray` check for `array` type doesn't conflate with Typed Arrays (it returns false for them, which is correct).
  - Ensuring `object` type check doesn't conflate (it returns true, but Typed Arrays have specific types now so they should be used when specificity is needed).
