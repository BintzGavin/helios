# Spec: Recursive Schema Support for Studio Props Editor

#### 1. Context & Goal
- **Objective**: Implement recursive UI support for `object` and `array` types in the Studio Props Editor to match Core v2 schema capabilities.
- **Trigger**: Vision gap identified - Core supports nested schemas (properties/items), but Studio currently falls back to a raw JSON editor for these types.
- **Impact**: Enables user-friendly, form-based editing of complex composition props (e.g., lists of text, nested configuration objects) without requiring users to write raw JSON.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx`
  - Add `ObjectInput` and `ArrayInput` components.
  - Update `SchemaInput` dispatch logic to use these new components when recursion is defined.
- **Modify**: `packages/studio/src/components/PropsEditor.css`
  - Add styles for nested containers (indentation, borders).
  - Add styles for array item controls (add/remove buttons).
- **Modify**: `packages/studio/src/components/PropsEditor.test.tsx`
  - Add unit test case verifying nested inputs are rendered for complex schemas.

#### 3. Implementation Spec
- **Architecture**:
  - The `SchemaInput` component acts as a recursive dispatcher.
  - **Recursion Logic**:
    - If `definition.type === 'object'` AND `definition.properties` exists: Render `ObjectInput`.
    - If `definition.type === 'array'` AND `definition.items` exists: Render `ArrayInput`.
    - Else: Fallback to existing `JsonInput`.
- **Components**:
  - **`ObjectInput`**:
    - Props: `definition` (PropDefinition), `value` (object), `onChange` (fn).
    - Render: Iterates `Object.entries(definition.properties)`.
    - Recursion: Calls `<SchemaInput />` for each property.
    - Updates: `onChange({ ...value, [key]: newValue })`.
  - **`ArrayInput`**:
    - Props: `definition` (PropDefinition), `value` (array), `onChange` (fn).
    - Render: Iterates `value.map((item, index))`.
    - Recursion: Calls `<SchemaInput definition={definition.items} ... />` for each item.
    - Controls: "Remove" button per item, "Add Item" button at bottom.
    - Updates: `splice` for remove, `push` for add (immutable copies).
- **Default Values**:
  - New array items should initialize using `definition.items.default` if present, or a sensible type-based default (e.g., `""`, `0`, `false`, `{}`).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test` in `packages/studio`.
- **Success Criteria**:
  - `PropsEditor.test.tsx` passes.
  - New test case `renders nested schema inputs` confirms that:
    - Nested object keys appear as labels.
    - Array items are rendered as individual inputs.
    - "Add Item" button is present for arrays.
- **Edge Cases**:
  - `value` is undefined/null (should default to empty object/array).
  - `definition.properties` or `definition.items` is missing (fallback to JSON).
  - Empty array initialization.
