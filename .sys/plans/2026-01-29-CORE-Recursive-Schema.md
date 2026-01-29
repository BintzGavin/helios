# Plan: Implement Recursive Schema Validation

## 1. Context & Goal
- **Objective**: Extend `HeliosSchema` to support recursive validation for arrays (`items`) and objects (`properties`).
- **Trigger**: Vision gap identified - "Array Validation" is currently shallow, preventing the definition of typed lists (e.g., list of slides, list of colors) required for Helios Studio.
- **Impact**: Enables complex, nested configuration schemas for compositions, allowing the Studio to generate rich property editors and ensuring data integrity for "Series" and "Sequence" components.

## 2. File Inventory
- **Modify**: `packages/core/src/schema.ts` (Add `items`/`properties` to `PropDefinition`, refactor `validateProps`).
- **Modify**: `packages/core/src/schema.test.ts` (Add tests for nested arrays/objects).

## 3. Implementation Spec

### Architecture
- **Recursive Validation**: The `validateProps` function will be refactored to delegate value validation to a helper `validateValue` function. This helper will handle the recursive logic for nested types.
- **`items` Support**: For `type: 'array'`, an optional `items` property in the definition will describe the schema for each element.
- **`properties` Support**: For `type: 'object'`, an optional `properties` property (which is itself a `HeliosSchema`) will describe the fields of the object.

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
1.  **Type Check**: Validate basic type (string, number, array, etc.). Throw if mismatch.
2.  **Constraints**: Validate `enum`, `minimum`, `maximum`, `color` format.
3.  **Recursive Array**:
    - If `type === 'array'` AND `definition.items` exists:
        - Iterate `value` (as array).
        - For each `item`, call `validateValue(item, definition.items, "${keyPath}[${index}]")`.
4.  **Recursive Object**:
    - If `type === 'object'` AND `definition.properties` exists:
        - Call `validateProps(value, definition.properties)`.
        - Note: `validateProps` might need to be wrapped or adapted to handle error path context if we want "prop 'user.name'" messages, or we handle the catch block. Ideally `validateValue` calls `validateProps` recursively.

#### `validateProps(props, schema)`
1.  Iterate schema keys.
2.  Handle `undefined` values:
    - If `default` exists, use it.
    - If `!optional` and no default, throw "Missing required prop".
3.  Call `validateValue` for the value.
4.  Return validated props object.

### Dependencies
- None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - Existing tests pass (backward compatibility).
    - **Array of Primitives**: Schema `{ list: { type: 'array', items: { type: 'string' } } }` validates `['a', 'b']` and rejects `[1, 2]`.
    - **Array of Objects**: Schema for list of slides validates `[{ src: 'img.png', duration: 5 }]`.
    - **Nested Objects**: Schema `{ user: { type: 'object', properties: { name: { type: 'string' } } } }` validates `{ user: { name: 'Alice' } }`.
    - **Error Messages**: Errors should indicate the nested path (e.g. "Invalid type for prop 'list[0]'. Expected string.").
- **Edge Cases**:
    - Nested arrays (Array of Arrays).
    - Missing required properties inside a nested object.
    - Extra properties in nested objects (should be allowed/ignored as per current behavior).
