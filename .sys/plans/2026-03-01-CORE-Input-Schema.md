# Plan: Implement Input Props Schema Validation

#### 1. Context & Goal
- **Objective**: Implement a lightweight schema validation system for `inputProps` in the `Helios` class.
- **Trigger**: The Vision (README) promises "Props editor with schema validation" for the Studio, which requires the Core engine to support schema definition and validation. Currently, `inputProps` accepts any `Record<string, any>` without validation.
- **Impact**: Enables type safety for compositions, provides actionable error messages for agents/users when passing invalid props, and establishes the data contract needed for the future Studio Props Editor.

#### 2. File Inventory
- **Create**:
    - `packages/core/src/schema.ts`: Definitions for `PropType`, `HeliosSchema`, and validation logic.
    - `packages/core/src/schema.test.ts`: Unit tests for schema validation.
- **Modify**:
    - `packages/core/src/index.ts`: Update `HeliosOptions` to include `schema`, and update `Helios` class to validate props in constructor and `setInputProps`.
    - `packages/core/src/errors.ts`: Add `INVALID_INPUT_PROPS` error code.
- **Read-Only**:
    - `packages/core/src/signals.ts`: Will use signals to store schema if needed (though schema is likely static).

#### 3. Implementation Spec
- **Architecture**:
    - Introduce a declarative schema definition (e.g., `schema: { text: { type: 'string' } }`).
    - Use a helper function `validateProps(props, schema)` that returns `true` or throws `HeliosError`.
    - `Helios` instance will hold the `schema` (optional) and enforce it.
- **Pseudo-Code**:
    ```typescript
    // packages/core/src/schema.ts

    export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'color';

    export interface PropDefinition {
      type: PropType;
      optional?: boolean;
      default?: any;
    }

    export type HeliosSchema = Record<string, PropDefinition>;

    export function validateProps(props: Record<string, any>, schema?: HeliosSchema): void {
      if (!schema) return;

      for (const [key, def] of Object.entries(schema)) {
        const val = props[key];

        // Check requirement
        if (val === undefined) {
          if (!def.optional && def.default === undefined) {
             throw new HeliosError(INVALID_INPUT_PROPS, `Missing required prop: ${key}`);
          }
          continue;
        }

        // Check type
        if (def.type === 'string' && typeof val !== 'string') throwError(key, 'string');
        if (def.type === 'number' && typeof val !== 'number') throwError(key, 'number');
        if (def.type === 'boolean' && typeof val !== 'boolean') throwError(key, 'boolean');
        if (def.type === 'array' && !Array.isArray(val)) throwError(key, 'array');
        if (def.type === 'object' && (typeof val !== 'object' || Array.isArray(val))) throwError(key, 'object');
        // 'color' treats as string for runtime check, maybe regex match if ambitious
      }
    }
    ```
- **Public API Changes**:
    - Export `PropType` type alias.
    - Export `PropDefinition` interface.
    - Export `HeliosSchema` type.
    - Update `HeliosOptions` to accept `schema?: HeliosSchema`.
    - Update `Helios` class to expose `public readonly schema: HeliosSchema | undefined`.
- **Dependencies**: None. Pure TypeScript implementation.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `schema.test.ts` passes, verifying that valid props pass and invalid props throw.
    - `index.test.ts` (or new integration test) verifies `Helios` constructor throws on invalid initial props.
    - `setInputProps` throws on invalid update.
    - Verify default values are applied if prop is missing but default exists (optional enhancement, but good for "Impact").
- **Edge Cases**:
    - Extra props (should allow, but maybe strictly validate only defined keys? Standard practice is often to allow unknown props to pass through unless strict mode. Let's start with allowing extra props to be non-breaking).
    - Missing optional props (should pass).
    - Type coercion (should NOT happen; Core is strict).
