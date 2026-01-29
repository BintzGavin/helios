# Spec: Implement Array Item Schema Validation

## 1. Context & Goal
- **Objective**: Enhance `HeliosSchema` to support validation of array items.
- **Trigger**: The Vision ("Props editor with schema validation") requires rich schema definitions, but currently `array` type only checks `Array.isArray()`, ignoring content types.
- **Impact**: Enables `packages/studio` to generate specific UI controls for lists (e.g., "List of Images" vs "List of Numbers") and ensures runtime type safety for compositions.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Update `PropDefinition` and `validateProps`)
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for array item validation)

## 3. Implementation Spec
- **Architecture**: Extend `PropDefinition` interface to include an optional `items` property of type `PropDefinition`. Update `validateProps` to recursively validate elements if `items` is present.
- **Public API Changes**:
  - Update `PropDefinition` interface:
    ```typescript
    export interface PropDefinition {
      // ... existing properties
      items?: PropDefinition; // For 'array' type validation
    }
    ```
- **Logic**:
  - In `validateProps`, when `def.type === 'array'`, check if `def.items` exists.
  - If yes, iterate over `val` (the array) and validate each item against `def.items`.
  - The validation logic for items should reuse the main validation logic. This may require refactoring the core validation loop into a `validateValue(value, definition)` helper function that `validateProps` calls.
- **Pseudo-Code**:
  ```typescript
  // Refactor validation logic to be reusable
  function validateValue(val: any, def: PropDefinition, key: string): any {
     // Check type (string, number, boolean, array, object...)
     // ... existing type checks ...

     // Check constraints (min, max, enum)
     // ... existing constraint checks ...

     // New: Array Item Validation
     if (def.type === 'array' && def.items) {
        val.forEach((item, index) => {
           validateValue(item, def.items!, `${key}[${index}]`);
        });
     }

     return val;
  }

  export function validateProps(props, schema) {
     const validProps = { ...props };
     for (const [key, def] of Object.entries(schema)) {
        // ... existence checks and defaults ...
        validProps[key] = validateValue(validProps[key], def, key);
     }
     return validProps;
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Validates array of primitives (e.g. `items: { type: 'string' }`).
  - Validates array of complex types (e.g. `items: { type: 'color' }`).
  - Throws `HeliosError` if an item in the array is invalid, with a clear path (e.g. `Invalid type for prop 'list[0]'`).
  - Passes if `items` is undefined (legacy behavior).
- **Edge Cases**:
  - Empty array (should pass).
  - Array with mixed types (should fail if schema enforces type).
  - Nested arrays (e.g. `items: { type: 'array', items: { type: 'number' } }`).
