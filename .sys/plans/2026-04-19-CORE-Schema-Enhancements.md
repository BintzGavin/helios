# 1. Context & Goal
- **Objective**: Enhance `HeliosSchema` to support `step` for numeric inputs and `format` for string inputs.
- **Trigger**: The "Helios Studio" vision includes a "Props editor with schema validation". Currently, the schema lacks `step` (crucial for sliders) and `format` (for UI hints like 'multiline').
- **Impact**: Enables `packages/studio` (and other consumers) to generate richer UI controls (e.g., stepped sliders, text areas), improving the Agent/User experience.

# 2. File Inventory
- **Modify**: `packages/core/src/schema.ts`
  - Add `step` and `format` to `PropDefinition` interface.
  - Update `validateProps` logic if necessary (mostly pass-through/type check).
- **Modify**: `packages/core/src/schema.test.ts`
  - Add tests to verify `step` and `format` are accepted in schema definition.

# 3. Implementation Spec
- **Architecture**: Extend `PropDefinition` interface.
- **Pseudo-Code**:
  ```typescript
  export interface PropDefinition {
    // ... existing properties
    step?: number;   // For 'number' type
    format?: string; // For 'string' type (e.g., 'multiline', 'date', 'email', 'url')
  }
  ```
- **Public API Changes**: `PropDefinition` interface updated.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - New tests in `schema.test.ts` pass, verifying that `step` and `format` can be defined and persist in the schema.
  - Existing tests pass.
- **Edge Cases**:
  - `step` defined on non-number type (should ideally be ignored or flagged, but for now just allowed in type definition).
