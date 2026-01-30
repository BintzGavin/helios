# Plan: Implement Schema Constraints (Array/String)

## 1. Context & Goal
- **Objective**: Add length constraints (`minItems`, `maxItems`, `minLength`, `maxLength`) to the Helios Schema validation system.
- **Trigger**: The current schema system lacks the ability to validate fixed-size arrays (e.g., Vectors, Matrices) or restrict string length, which is critical for "Performance When It Matters" (WebGL interop) and "Studio Props Editor" reliability.
- **Impact**: Enables strict validation for tuple-like arrays (e.g., `[x, y, z]`) and provides necessary constraints for auto-generated UI forms in the Studio.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts`
  - Add optional constraint properties to `PropDefinition`.
  - Implement validation logic in `validateValue`.
  - Implement definition validation in `validateSchema`.
- **Modify**: `packages/core/src/schema.test.ts`
  - Add test cases for new constraints.

## 3. Implementation Spec

### Architecture
Extend the existing `PropDefinition` interface and `validateValue` function. This follows the existing recursive validation pattern.

### Pseudo-Code

**1. Update `PropDefinition` Interface:**
```typescript
export interface PropDefinition {
  // ... existing fields
  minItems?: number; // For arrays and TypedArrays
  maxItems?: number; // For arrays and TypedArrays
  minLength?: number; // For strings
  maxLength?: number; // For strings
}
```

**2. Update `validateSchema` (Definition Validation):**
- If `minItems`/`maxItems` is set:
  - Ensure non-negative and min <= max.
  - Allow on `type: 'array'` AND all Typed Array types (`int8array`, `float32array`, etc.).
- If `minLength`/`maxLength` is set:
  - Ensure non-negative and min <= max.
  - Allow on `type: 'string'`.

**3. Update `validateValue` (Runtime Validation):**
- **Strings**:
  - Check `minLength`/`maxLength` against `val.length`.
- **Arrays & Typed Arrays**:
  - Identify if type is array-like (`array` or any `*array` type).
  - Check `minItems`/`maxItems` against `val.length`.
  - Throw `INVALID_INPUT_PROPS` with clear message if violated.

### Public API Changes
- `PropDefinition` gains 4 new optional properties.
- `HeliosErrorCode.INVALID_INPUT_PROPS` will be thrown for length violations.
- `HeliosErrorCode.INVALID_SCHEMA` will be thrown for invalid constraint definitions (e.g. min > max).

### Dependencies
None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Valid vectors `[1, 2, 3]` pass when `minItems: 3, maxItems: 3`.
  - `Float32Array` of length 3 passes same check.
  - Invalid vectors `[1, 2]` fail.
  - Strings respect length limits.
  - Invalid schema definitions (negative length) are rejected.
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
