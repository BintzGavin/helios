# Context & Goal
- **Objective**: Enable users to drag assets from the Assets Panel and drop them into string inputs in the Props Editor to automatically populate the asset URL.
- **Trigger**: "Vision Gap" - The Assets Panel allows uploading/managing assets, but using them in compositions currently requires manual and invisible URL guessing.
- **Impact**: Significantly improves the "Agent Experience" and usability by making asset usage intuitive and seamless.

# File Inventory
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx`
  - Add `draggable` attribute and `onDragStart` handler to the main container.
- **Modify**: `packages/studio/src/components/PropsEditor.tsx`
  - Update local `PropInput` component (specifically the string case) to handle `onDrop` and `onDragOver`.
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx`
  - Update `StringInput` component to handle `onDrop` and `onDragOver`.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx` (for Asset interface reference)

# Implementation Spec
- **AssetItem.tsx**:
  - Set `draggable={true}` on the `.asset-item` div.
  - Implement `handleDragStart(e: React.DragEvent)`:
    - `e.dataTransfer.setData('text/plain', asset.url)`
    - `e.dataTransfer.effectAllowed = 'copy'`
- **PropsEditor.tsx** (in `PropInput` component):
  - In the `type === 'string'` block:
    - Add `onDragOver` handler: call `e.preventDefault()`.
    - Add `onDrop` handler:
      - `e.preventDefault()`
      - `const url = e.dataTransfer.getData('text/plain')`
      - `if (url) onChange(url)`
- **SchemaInputs.tsx** (in `StringInput` component):
  - Add `onDragOver` handler: call `e.preventDefault()`.
  - Add `onDrop` handler:
    - `e.preventDefault()`
    - `const url = e.dataTransfer.getData('text/plain')`
    - `if (url) onChange(url)`

# Test Plan
- **Verification**:
  1. Start Studio with `npx helios studio`.
  2. Upload an image (e.g., `test.png`) in the Assets Panel.
  3. Drag `test.png` from the Assets Panel.
  4. Drop it onto a string input in the Props Editor (both schema-defined and undefined).
  5. Verify the input value updates to `/api/assets/test.png` (or similar URL).
- **Success Criteria**: Dropping an asset on a string input updates the prop value with the asset URL.
- **Edge Cases**:
  - Dragging plain text from another window (should also work).
  - Dragging to non-string inputs (should default to browser behavior or do nothing, existing logic prevents dropping on number inputs unless implemented there too, but we only target string inputs).
