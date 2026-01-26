# Plan: Enhance Input Schema Validation

## 1. Context & Goal
- **Objective**: Expand `HeliosSchema` and `validateProps` to support `min`, `max`, `enum`, and `step` constraints.
- **Trigger**: The V1.x Roadmap calls for a "Props editor with schema validation" in Helios Studio. The current schema in `packages/core` is too basic (only type checks) to support rich UI generation (sliders, dropdowns) or strict runtime validation.
- **Impact**: Enables Helios Studio (and other consumers) to generate better UIs (sliders, selects) and enforces stricter runtime validation for parametric compositions.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add types and validation logic)
- **Modify**: `packages/core/src/schema.test.ts` (Add unit tests for new constraints)
- **Read-Only**: `packages/core/src/index.ts` (Ensure exports remain correct)

## 3. Implementation Spec
- **Architecture**: Extend the `PropDefinition` interface to include optional constraint fields (`min`, `max`, `step`, `enum`) and update the `validateProps` function to enforce them.
- **Pseudo-Code**:
  ```typescript
  export interface PropDefinition {
    type: PropType;
    optional?: boolean;
    default?: any;
    // New constraints
    min?: number;     // Valid only for type: 'number'
    max?: number;     // Valid only for type: 'number'
    step?: number;    // UI hint mainly, but can validatable
    enum?: any[];     // Valid for 'string' | 'number'
    label?: string;   // UI Label
    description?: string; // UI Tooltip/Help
  }

  export function validateProps(props, schema) {
    // ... existing iteration ...

    // Type checking (existing) ...

    // Constraint Checking
    if (def.type === 'number') {
      if (def.min !== undefined && val < def.min) throw Error;
      if (def.max !== undefined && val > def.max) throw Error;
    }

    if (def.enum !== undefined) {
      if (!def.enum.includes(val)) throw Error;
    }
  }
  ```
- **Public API Changes**:
  - `PropDefinition` interface gets new optional properties.
  - `validateProps` throws `HeliosError` (INVALID_INPUT_PROPS) when constraints are violated.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Existing tests pass (No regression).
  - New tests confirm `min`/`max` validation throws on violation.
  - New tests confirm `enum` validation throws on violation.
  - New tests confirm valid values pass.
- **Edge Cases**:
  - `min` defined for non-number type (should ideally be ignored or warned, but spec says "Valid only for type: 'number'").
  - `enum` values that don't match the `type` (runtime check should probably validate the value against the type FIRST, then the enum).
