# Plan: Implement Recursive Schema Validation

## 1. Context & Goal
- **Objective**: Extend `HeliosSchema` to support recursive validation for arrays (`items`) and objects (`properties`).
- **Trigger**: Vision gap identified - "Array Validation" is currently shallow, preventing the definition of typed lists (e.g., list of slides, list of colors) required for Helios Studio. This supersedes the unexecuted plan `2026-01-29-CORE-Recursive-Schema.md`.
- **Impact**: Enables complex, nested configuration schemas for compositions, allowing the Studio to generate rich property editors and ensuring data integrity for "Series" and "Sequence" components.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add `items`/`properties` to `PropDefinition`, refactor `validateProps`).
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for nested arrays/objects).

## 3. Implementation Spec

### Architecture
- **Recursive Validation**: The `validateProps` function will be refactored to delegate value validation to a helper `validateValue` function. This helper will handle the recursive logic for nested types.
- **`items` Support**: For `type: 'array'`, an optional `items` property in the definition will describe the schema for each element (as a `PropDefinition`).
- **`properties` Support**: For `type: 'object'`, an optional `properties` property (which is a `HeliosSchema`, i.e., `Record<string, PropDefinition>`) will describe the fields of the object.

### Public API Changes
Update `PropDefinition` interface in `packages/core/src/schema.ts`:
```typescript
export interface PropDefinition {
  // ... existing fields
  items?: PropDefinition;               // For type: 'array'
  properties?: Record<string, PropDefinition>; // For type: 'object'
}
```

### Pseudo-Code

#### `validateValue(value, definition, keyPath)`
1.  **Type Check**: Validate basic type (string, number, array, etc.) against `definition.type`. Throw if mismatch using `keyPath` for error context.
2.  **Constraints**: Validate `enum`, `minimum`, `maximum`, `color` format if applicable.
3.  **Recursive Array**:
    - If `type === 'array'` AND `definition.items` exists:
        - Iterate `value` (as array).
        - For each `item` at `index`:
            - Call `validateValue(item, definition.items, "${keyPath}[${index}]")`.
            - (Optional) Replace the item with the return value if `validateValue` normalizes it (though `validateValue` mostly validates).
4.  **Recursive Object**:
    - If `type === 'object'` AND `definition.properties` exists:
        - Call `validateProps(value, definition.properties)`.
        - Note: `validateProps` expects `(props, schema)`.
        - Catch errors from `validateProps` to potentially prepend `keyPath` to the error message (e.g. "Missing required prop: user.name" instead of just "name").
5.  **Return**: The validated (and possibly defaulted) value.

#### `validateProps(props, schema)`
1.  Iterate `schema` keys.
2.  For each `key` / `def`:
    - Get `val` from `props[key]`.
    - **Required Check**: If `val` is undefined:
        - If `def.default` exists, use it.
        - Else if `!optional`, throw "Missing required prop: ${key}".
    - **Validation**:
        - Call `validateValue(val, def, key)`.
        - Assign result back to `validProps[key]`.
3.  Return `validProps`.

### Dependencies
- None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - Existing tests pass (backward compatibility).
    - **Array of Primitives**: Schema `{ list: { type: 'array', items: { type: 'string' } } }` validates `['a', 'b']` and rejects `[1, 2]`.
    - **Array of Objects**: Schema for list of slides `{ slides: { type: 'array', items: { type: 'object', properties: { src: { type: 'image' } } } } }` validates correctly.
    - **Nested Objects**: Schema `{ user: { type: 'object', properties: { name: { type: 'string' } } } }` validates `{ user: { name: 'Alice' } }`.
    - **Defaults in Nested Objects**: If nested object has missing optional prop with default, it should be filled.
- **Edge Cases**:
    - Invalid types inside nested arrays.
    - Missing required properties inside nested objects.
