# STUDIO: Enhance Props Editor with Step and Format Support

## 1. Context & Goal
- **Objective**: Update the Props Editor to respect `step` and `format` metadata from the Composition Schema, enabling finer control for numbers and specialized inputs for strings (e.g., date, email, url).
- **Trigger**: A gap exists between `packages/core` Schema capabilities (v2.12.0+ supports `step`/`format` hints) and `packages/studio` UI (which currently ignores them).
- **Impact**: Improves the "WYSIWYG" editing experience by providing appropriate UI controls for specific data formats, reinforcing Studio's role as a robust IDE.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx` (Update input components to handle new props)
- **Modify**: `packages/studio/src/components/PropsEditor.test.tsx` (Add verification tests)
- **Read-Only**: `packages/core/src/schema.ts` (Reference for PropDefinition)

## 3. Implementation Spec
- **Architecture**: Extend the existing `SchemaInput` dispatch logic to pass `definition.step` to `NumberRangeInput` and `definition.format` to `StringInput`.
- **Logic**:
  - Update `NumberRangeInput` component signature to accept `step?: number`.
  - In `NumberRangeInput`:
    - If `step` is explicitly provided, pass it to `<input type="range">` and `<input type="number">`.
    - If `step` is NOT provided, fallback to the existing logic (calculate from min/max or default).
  - Update `StringInput` component signature to accept `format?: string`.
  - In `StringInput`:
    - Determine `inputType` based on `format`:
      - 'date' → `date`
      - 'time' → `time`
      - 'date-time' → `datetime-local`
      - 'email' → `email`
      - 'uri' | 'url' → `url`
      - 'color' → `color` (Only if type is string but format is color, though `type: color` exists)
      - Default → `text`
    - Render `<input type={inputType} ... />`.
- **Public API Changes**: None (Internal component props only).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test` in `packages/studio`.
- **Success Criteria**:
  - New test case in `PropsEditor.test.tsx` confirms `step` attribute is rendered on number inputs when schema defines it.
  - New test case in `PropsEditor.test.tsx` confirms `type` attribute corresponds to `format` for string inputs (e.g. `type="date"` for `format: 'date'`).
- **Edge Cases**:
  - Invalid format strings (should fallback to text).
  - Step provided without min/max (should still work on number input).
