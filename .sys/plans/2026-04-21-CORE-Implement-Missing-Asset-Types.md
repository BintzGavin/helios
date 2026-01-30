# 📋 Spec: Implement Missing Asset Types

## 1. Context & Goal
- **Objective**: Add `model`, `json`, and `shader` to the supported `PropType` values in `packages/core`.
- **Trigger**: Vision gap - `packages/studio` supports these asset types for discovery, but `packages/core` schema validation rejects them.
- **Impact**: Enables Studio to correctly define and pass these asset types to compositions without runtime errors.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Update `PropType` and validation logic)
- **Modify**: `packages/core/src/schema.test.ts` (Add test cases)

## 3. Implementation Spec
- **Architecture**: Extend the `PropType` union type and update the `validateValue` function to treat these new types as strings (URLs/paths), similar to `image`, `video`, etc.
- **Pseudo-Code**:
  ```typescript
  // schema.ts
  export type PropType = ... | 'model' | 'json' | 'shader';

  function validateValue(...) {
    // ...
    // Include new types in the string check
    if (['color', 'image', 'video', 'audio', 'font', 'model', 'json', 'shader'].includes(def.type)) {
       if (typeof val !== 'string') throwError(...);
    }
    // ...
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**: New test cases for `model`, `json`, `shader` pass. Existing tests pass.
- **Edge Cases**: Validate that invalid values (non-strings) for these types throw errors.
