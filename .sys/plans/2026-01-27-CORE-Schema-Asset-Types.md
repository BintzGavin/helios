# Context & Goal
- **Objective**: Expand `HeliosSchema` to support asset types (`image`, `video`, `audio`, `font`) to enable rich inputs in the future Studio.
- **Trigger**: "Studio IDE" roadmap item requires "Props editor with schema validation" that can handle assets intelligently.
- **Impact**: Enables the Studio to render appropriate UI controls (file pickers) and validation for asset paths. This unblocks "Asset Management" features in the Studio.

# File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add types to `PropType`, update `validateProps` to handle new types as strings)
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for new types verifying string inputs and rejecting invalid types)
- **Read-Only**: `packages/core/src/errors.ts` (For Error codes)

# Implementation Spec
- **Architecture**: Extend the `PropType` union type to include asset categories. These will be runtime-validated as `string` types (paths/URLs). This follows the pattern established by the `color` type.
- **Pseudo-Code**:
  ```typescript
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

  function validateProps(...) {
    // ...
    // Check type
    // ...
    // Asset types are treated as strings
    if (['image', 'video', 'audio', 'font'].includes(def.type) && typeof val !== 'string') {
      throwError(key, `${def.type} (string)`);
    }
    // ...
  }
  ```
- **Public API Changes**:
  - `PropType` type definition expanded.
  - `HeliosSchema` validation logic accepts new types.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Tests pass.
  - New test case `should validate asset types` confirms `image`, `video`, `audio`, `font` accept strings.
  - New test case confirms they reject numbers and objects.
- **Edge Cases**:
  - Verify that `color` still works as expected.
  - Verify `optional` and `default` work with new types.

# Complete pre commit steps
- Ensure proper testing, verification, review, and reflection are done.
