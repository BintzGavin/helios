# Context & Goal
- **Objective**: Expand `HeliosSchema` to support asset types (`image`, `video`, `audio`, `font`) to enable rich inputs in the future Studio.
- **Trigger**: "Studio IDE" roadmap item requires "Props editor with schema validation" that can handle assets intelligently. Currently, only basic types (`string`, `number`, etc.) and `color` are supported.
- **Impact**: Enables the Studio to render appropriate UI controls (file pickers) and validation for asset paths. This unblocks "Asset Management" features in the Studio.

# File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add types to `PropType`, update `validateProps` to handle new types as strings)
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for new types verifying string inputs and rejecting invalid types)

# Implementation Spec
- **Architecture**: Extend the `PropType` union type to include asset categories. These will be runtime-validated as `string` types (paths/URLs). This follows the pattern established by the `color` type.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/schema.ts

  export type PropType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'color'
    | 'image'  // New
    | 'video'  // New
    | 'audio'  // New
    | 'font';  // New

  export function validateProps(props: Record<string, any>, schema?: HeliosSchema): Record<string, any> {
    // ...
    for (const [key, def] of Object.entries(schema)) {
      // ...
      // Check type
      // ...
      if (def.type === 'color' && typeof val !== 'string') throwError(key, 'color (string)');

      // New Asset Types
      if (['image', 'video', 'audio', 'font'].includes(def.type) && typeof val !== 'string') {
         throwError(key, `${def.type} (string)`);
      }
    }
    return validProps;
  }
  ```
- **Public API Changes**:
  - `PropType` type definition expanded.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `packages/core/src/schema.test.ts` passes.
  - New test case `should validate asset types` confirms `image`, `video`, `audio`, `font` accept strings.
  - New test case confirms they reject numbers and objects.
- **Edge Cases**:
  - Verify that `color` still works as expected.
  - Verify `optional` and `default` work with new types.
