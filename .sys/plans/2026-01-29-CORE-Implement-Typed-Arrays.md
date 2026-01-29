# 2026-01-29-CORE-Implement-Typed-Arrays

## 1. Context & Goal
- **Objective**: Implement support for typed arrays in `HeliosSchema` (e.g., `string[]`, `color[]`) by adding an `items` property to `PropDefinition`.
- **Trigger**: The current `array` type only validates `Array.isArray()`, preventing `packages/studio` from generating specific UIs (like a list of colors or list of text fields) and enforcing type safety on list items.
- **Impact**: Unlocks rich list editing in Helios Studio and ensures runtime data integrity for list inputs.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add `items` to interface, implement validation logic)
- **Modify**: `packages/core/src/schema.test.ts` (Add unit tests for typed arrays)

## 3. Implementation Spec
- **Architecture**:
    - Extend `PropDefinition` with an optional `items` field (recursive `PropDefinition`).
    - Refactor `validateProps` to extract core validation logic into a helper `validateValue(value, definition, key)`.
    - Recursively validate array items when `type: 'array'` and `items` is present.
- **Pseudo-Code**:
    ```typescript
    interface PropDefinition {
      // ... existing
      items?: PropDefinition;
    }

    function validateProps(props, schema) {
       // ... existing loop
       // Call validateValue(props[key], def, key)
    }

    function validateValue(val, def, key) {
       // Type checks (string, number, etc.)
       // Enum checks
       // Range checks

       if (def.type === 'array') {
         if (!Array.isArray(val)) throw ...
         if (def.items) {
           val.forEach((item, i) => validateValue(item, def.items, `${key}[${i}]`))
         }
       }
    }
    ```
- **Public API Changes**: `PropDefinition` interface gains `items?: PropDefinition`.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - Existing tests pass.
    - New tests pass for:
        - `string[]` validation.
        - `number[]` with `minimum` constraint on items.
        - `color[]` checking valid/invalid color strings.
        - Array with invalid item types throws `HeliosError`.
- **Edge Cases**:
    - Array with `items` but empty array (should pass).
    - Array with `items` definition but `optional` fields in item definition (ignored, as items are values).
