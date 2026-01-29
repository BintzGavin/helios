# Plan: Implement Typed Arrays in HeliosSchema

## 1. Context & Goal
- **Objective**: Enhance `HeliosSchema` validation to support typed arrays (e.g., array of strings, array of images), enabling recursive validation and better UI generation in Studio.
- **Trigger**: Vision gap in "Studio IDE" requirements. The current schema only checks `Array.isArray`, preventing the generation of specific list editors (e.g., image gallery vs. text list).
- **Impact**: Unlocks the ability for the Studio IDE to generate correct input components for array properties, a critical feature for compositions with dynamic lists (captions, slides, assets).

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Update `PropDefinition` and `validateProps`)
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for typed arrays and nested structures)
- **Read-Only**: `packages/core/src/errors.ts` (For error codes)

## 3. Implementation Spec
- **Architecture**:
  - Extend `PropDefinition` to support recursion via an optional `items` property.
  - Refactor `validateProps` to extract a reusable `validateValue` function that handles single-value validation.
  - Implement recursive validation logic within `validateValue` for handling `type: 'array'`.
- **Public API Changes**:
  - `PropDefinition`: Add `items?: PropDefinition;`
- **Pseudo-Code**:
  ```typescript
  interface PropDefinition {
    // ... existing
    items?: PropDefinition; // Recursive definition for array items
  }

  function validateProps(props, schema) {
    const valid = {};
    for key in schema:
      valid[key] = validateValue(props[key], schema[key], key);
    return valid;
  }

  function validateValue(value, def, path) {
    // Handle required/optional/default logic
    // Handle basic type checks (string, number, boolean)

    if (def.type === 'array') {
      if (!isArray(value)) throw Error;
      if (def.items) {
        // Recursive validation
        value.forEach((item, index) => {
          validateValue(item, def.items, `${path}[${index}]`);
        });
      }
    }

    // Handle enums, ranges, colors, assets
    return value;
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**:
  - Existing tests pass without regression.
  - New test cases for `array` of `string` pass.
  - New test cases for `array` of `image` pass.
  - Invalid items in an array throw `INVALID_INPUT_PROPS` with the correct index in the error message (e.g., `prop[2]`).
- **Edge Cases**:
  - Nested arrays (`items: { type: 'array', items: { type: 'string' } }`).
  - Empty arrays (should pass).
  - Array with mixed types (should fail if schema is strict).
