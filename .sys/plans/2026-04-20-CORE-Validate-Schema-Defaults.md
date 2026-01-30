# Plan: Validate Schema Defaults

## 1. Context & Goal
- **Objective**: Implement a `validateSchema` function to ensure that `default` values defined in `HeliosSchema` match their specified types and constraints.
- **Trigger**: Currently, `validateProps` assigns default values without validating them against the schema definition. If a schema contains an invalid default (e.g., `default: "red"` for `type: "number"`), it is injected into the state, causing potential runtime errors later.
- **Impact**: Improves robustness and Agent Experience (AX) by catching invalid schema definitions at instantiation time with clear, actionable error messages.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Implement `validateSchema` function)
- **Modify**: `packages/core/src/index.ts` (Call `validateSchema` in `Helios` constructor)
- **Modify**: `packages/core/src/errors.ts` (Add `INVALID_SCHEMA` error code)
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for `validateSchema` and invalid defaults)

## 3. Implementation Spec
- **Architecture**:
  - Add `INVALID_SCHEMA` to `HeliosErrorCode`.
  - Export a new `validateSchema(schema: HeliosSchema)` function from `schema.ts`.
  - The function iterates over all property definitions in the schema.
  - If a `default` value is present, it invokes `validateValue(def.default, def, key)` (reusing existing validation logic).
  - Recursively validates `items` (for arrays) and `properties` (for nested objects).
  - In `Helios` constructor, call `validateSchema(this.schema)` *before* processing `inputProps`.
- **Pseudo-Code**:
  ```typescript
  export function validateSchema(schema: HeliosSchema, parentKey = ''): void {
    for (key in schema) {
      def = schema[key]
      path = parentKey ? parentKey + '.' + key : key

      // Validate default value if present
      if (def.default !== undefined) {
        try {
          validateValue(def.default, def, path)
        } catch (e) {
          // Wrap error to indicate it's a schema definition issue
          throw new HeliosError(HeliosErrorCode.INVALID_SCHEMA, `Schema default for '${path}' is invalid: ${e.message}`)
        }
      }

      // Recurse
      if (def.type === 'array' && def.items) {
        // We need to validate the 'items' definition itself,
        // but 'items' is a PropDefinition, not a Schema (Record).
        // However, if 'items' has a default (rare but possible?), we should check it.
        // Actually, 'items' defines the type of array elements.
        // It might have nested 'properties' if it's an object.
        if (def.items.properties) {
           validateSchema(def.items.properties, path + '[]')
        }
      }
      if (def.type === 'object' && def.properties) {
        validateSchema(def.properties, path)
      }
    }
  }
  ```
- **Public API Changes**:
  - `validateSchema` is exported from `packages/core`.
  - `HeliosErrorCode.INVALID_SCHEMA` is added.
  - `Helios` constructor will now throw `HeliosError` if `options.schema` contains invalid defaults.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - New tests in `schema.test.ts` pass.
  - `Helios` constructor throws when initialized with a schema containing invalid defaults.
  - Existing tests pass (regression check).
- **Edge Cases**:
  - Nested objects with invalid defaults.
  - Arrays with invalid defaults.
  - Enum validation on defaults.
  - `minimum`/`maximum` validation on defaults.
