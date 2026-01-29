# Plan: Implement Typed Arrays in Schema

## 1. Context & Goal
- **Objective**: Extend `HeliosSchema` to support typed arrays, allowing validation of array items.
- **Trigger**: Analysis of `packages/core/src/schema.ts` revealed that `type: 'array'` only performs a shallow `Array.isArray` check, failing to validate the contents of the array.
- **Impact**: This feature unlocks the ability for `packages/studio` to generate rich, typed list UIs (e.g., a list of colors or images) and ensures runtime type safety for array inputs in compositions.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts`
- **Read-Only**: `packages/core/src/index.ts`

## 3. Implementation Spec
- **Architecture**:
  - Extend the `PropDefinition` interface to include an optional recursive `items` property.
  - Refactor `validateProps` to extract a `validateValue` helper function that can be used recursively for array items.
- **Pseudo-Code**:
  ```typescript
  export interface PropDefinition {
    type: PropType;
    // ... existing properties
    items?: PropDefinition; // Recursive definition for array items
  }

  function validateValue(value: any, def: PropDefinition, path: string): any {
    // 1. Type Check (string, number, boolean, object, etc.)
    // 2. Specialized Checks (Color, Enum, Range)

    if (def.type === 'array') {
      if (!Array.isArray(value)) throwError(path, 'array');
      if (def.items) {
        return value.map((item, index) =>
          validateValue(item, def.items!, `${path}[${index}]`)
        );
      }
    }

    return value;
  }

  export function validateProps(props: Record<string, any>, schema?: HeliosSchema): Record<string, any> {
    // Loop through schema keys
    // Handle undefined/default/optional logic
    // Call validateValue(val, def, key) for each present value
    // Return validated object
  }
  ```
- **Public API Changes**:
  - `PropDefinition` now includes `items?: PropDefinition`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Existing tests pass (backward compatibility).
  - New tests confirm validation of array items (e.g., `items: { type: 'number' }` rejects strings).
  - Error messages correctly identify the invalid item index (e.g., `Invalid type for prop 'myList[2]'`).
- **Edge Cases**:
  - Empty arrays (should pass).
  - Nested arrays (array of arrays).
  - Arrays without `items` definition (should still perform shallow check).
