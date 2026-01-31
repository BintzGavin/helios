# Plan: Enhance Schema UI Constraints

#### 1. Context & Goal
- **Objective**: Add `pattern`, `accept`, and `group` to `PropDefinition` in `packages/core` to support richer UI generation and validation in Studio.
- **Trigger**: Vision gap "Helios Studio ... Props editor". Existing schema lacks file filtering, regex validation, and UI grouping (identified in README vision vs reality analysis).
- **Impact**: Enables Studio to show filtered file pickers, validate string formats (e.g., email, keys), and organize props into groups, improving the Agent/User Experience.

#### 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add types and validation logic)
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for new constraints)

#### 3. Implementation Spec
- **Architecture**: Extend the `PropDefinition` interface and validation functions. This is a purely additive change to the schema definition logic.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/schema.ts

  export interface PropDefinition {
    // ... existing fields
    pattern?: string;   // Regex pattern for string validation
    accept?: string[];  // Array of allowed file extensions (e.g. ['.jpg', '.png'])
    group?: string;     // UI grouping hint
  }

  function validateSchema(schema) {
    // ... existing validation
    if (def.pattern) {
       if (def.type !== 'string') throw InvalidSchema;
       try { new RegExp(def.pattern); } catch { throw InvalidSchema }
    }
    if (def.accept) {
       if (!Array.isArray(def.accept)) throw InvalidSchema;
       // check items are strings
       // check def.type is compatible (string or asset type)
    }
    // group is just a string, no complex validation needed
  }

  function validateProps(props, schema) {
    // ... existing validation

    // Pattern Check
    if (def.pattern && typeof val === 'string') {
      const regex = new RegExp(def.pattern);
      if (!regex.test(val)) throw InvalidInputProps;
    }

    // Accept Check
    if (def.accept && typeof val === 'string') {
      // Check if value ends with any of the accepted extensions (case-insensitive)
      const match = def.accept.some(ext => val.toLowerCase().endsWith(ext.toLowerCase()));
      if (!match) throw InvalidInputProps;
    }
  }
  ```
- **Public API Changes**:
  - `PropDefinition` adds `pattern`, `accept`, `group`.
  - `validateProps` throws `INVALID_INPUT_PROPS` for pattern/accept violations.
  - `validateSchema` throws `INVALID_SCHEMA` for invalid regex.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `validateSchema` throws for invalid regex pattern.
  - `validateSchema` throws if `pattern` is used on non-string type.
  - `validateProps` throws when string doesn't match `pattern`.
  - `validateProps` throws when file path doesn't match `accept` extensions.
  - `validateProps` passes for valid inputs.
  - Existing tests pass (regression check).
- **Edge Cases**:
  - `accept` case insensitivity (`.JPG` vs `.jpg`).
  - `pattern` with complex regex.
  - `group` existence (should not affect validation).
