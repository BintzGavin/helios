# Context & Goal
- **Objective**: Enable Drag-and-Drop of assets from the Assets Panel to the Props Editor.
- **Trigger**: Vision Gap - "Assets Panel" and "Props Editor" are disconnected; users must manually type asset paths.
- **Impact**: Improves Studio UX by allowing intuitive asset assignment to props (images, audio, etc.) and bridges the gap between asset management and composition configuration.

# File Inventory
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Add draggable attribute and handler)
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx` (Add drop handling to StringInput and export it)
- **Modify**: `packages/studio/src/components/PropsEditor.tsx` (Use StringInput for generic string props to inherit DnD)
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`

# Implementation Spec
- **Architecture**: Use standard HTML5 Drag and Drop API. No external libraries.
- **Pseudo-Code**:
  - **AssetItem.tsx**:
    - Add `draggable="true"` to the container div.
    - On `dragStart`, set `dataTransfer.setData('text/plain', asset.url)`.
    - (Optional) Set drag effect to 'copy'.
  - **SchemaInputs.tsx**:
    - In `StringInput` component:
      - Add `onDragOver` handler: call `preventDefault()` and set local state `isDragging = true`.
      - Add `onDragLeave` handler: set `isDragging = false`.
      - Add `onDrop` handler:
        - `preventDefault()`.
        - `const text = dataTransfer.getData('text/plain')`.
        - `onChange(text)`.
        - `isDragging = false`.
      - Add CSS class or style when `isDragging` is true (e.g., blue border).
    - Export `StringInput`.
  - **PropsEditor.tsx**:
    - Import `StringInput` from `./SchemaInputs`.
    - In `PropInput` component:
      - If `type === 'string'`, render `<StringInput value={value} onChange={onChange} />` instead of the raw `<input>`.
      - This ensures both schema-defined and generic string props support dropping.

# Public API Changes
- No public API changes. Internal component behavior update only.

# Dependencies
- None.

# Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Upload an image asset in the Assets Panel.
  3. Drag the image from the panel to a text input field in the Props Editor.
  4. Verify the input field highlights during drag-over.
  5. Drop the image.
  6. Verify the input value updates to the asset URL (e.g., `/assets/image.png`).
- **Success Criteria**:
  - Asset URL is correctly transferred.
  - Visual feedback is present.
  - Works for both specific schema props and generic string props.
- **Edge Cases**:
  - Dragging non-asset text: Should still work (it's a string input).
  - Dragging files from OS: Should not trigger the logic (browser default might happen, but `preventDefault` in `onDragOver` might stop it; explicitly we are handling text, maybe check types if needed, but text/plain is safe).
