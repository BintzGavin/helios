# Plan: Expand Input Schema for Studio UI

#### 1. Context & Goal
- **Objective**: Expand the `HeliosSchema` definition to support validation constraints (`minimum`, `maximum`, `enum`) and UI metadata (`label`, `description`).
- **Trigger**: The Studio V1.x vision requires a "Props editor with schema validation". To generate rich UI controls (sliders, dropdowns) and ensure data integrity, the schema must support more than just basic types.
- **Impact**: Enables the Studio to render user-friendly controls and provides stricter runtime validation for `inputProps` injection.

#### 2. File Inventory
- **Modify**: `packages/core/src/schema.ts`
  - Update `PropDefinition` interface.
  - Update `validateProps` function to check new constraints.
- **Modify**: `packages/core/src/schema.test.ts`
  - Add unit tests for `minimum`, `maximum`, and `enum` validation.
  - Verify metadata fields are ignored during validation.

#### 3. Implementation Spec
- **Architecture**: Extend the existing `PropDefinition` interface in `packages/core/src/schema.ts`. Implement simple constraint checks in `validateProps`.
- **Public API Changes**:
  - Update `PropDefinition`:
    ```typescript
    export interface PropDefinition {
      type: PropType;
      optional?: boolean;
      default?: any;
      // New fields
      minimum?: number;
      maximum?: number;
      enum?: (string | number)[];
      label?: string;
      description?: string;
    }
    ```
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/schema.ts

  export function validateProps(props: Record<string, any>, schema?: HeliosSchema): Record<string, any> {
    // ... existing logic ...

    for (const [key, def] of Object.entries(schema)) {
      const val = validProps[key];
      // ... existing requirement/type checks ...

      // Enum Check
      if (def.enum && !def.enum.includes(val)) {
        throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${key}' must be one of: ${def.enum.join(', ')}`);
      }

      // Range Check (Number only)
      if (typeof val === 'number') {
        if (def.minimum !== undefined && val < def.minimum) {
          throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${key}' must be >= ${def.minimum}`);
        }
        if (def.maximum !== undefined && val > def.maximum) {
          throw new HeliosError(HeliosErrorCode.INVALID_INPUT_PROPS, `Prop '${key}' must be <= ${def.maximum}`);
        }
      }
    }
    // ... return validProps ...
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - New tests pass:
    - `should throw if value is less than minimum`
    - `should throw if value is greater than maximum`
    - `should throw if value is not in enum`
    - `should pass valid range and enum values`
  - Existing tests pass (regression check).
- **Edge Cases**:
  - `enum` containing mixed types (should match strictly).
  - `minimum` defined for non-number type (should ignore or ideally types limit this, but runtime check keeps it safe).
