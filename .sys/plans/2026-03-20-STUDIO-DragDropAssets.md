# Context & Goal
- **Objective**: Enable users to drag assets from the Assets Panel and drop them into compatible inputs in the Props Editor to automatically populate the asset URL.
- **Trigger**: Vision Gap - "WYSIWYG editing experience" implies direct manipulation, and the current copy-paste workflow for asset URLs is inefficient.
- **Impact**: Significantly improves the "Agent Experience" and usability by making asset usage intuitive and seamless.

# File Inventory
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx`
  - Add `draggable` attribute and `onDragStart` handler.
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx`
  - Update `AssetInput` to handle `onDrop` with type validation.
  - Update `StringInput` to handle `onDrop` for generic text.
- **Modify**: `packages/studio/src/components/PropsEditor.tsx`
  - Update `PropInput` (schemaless fallback) to handle `onDrop` for string values.
- **Modify**: `packages/studio/src/components/PropsEditor.css`
  - Add `.drag-over` styles.

# Implementation Spec
- **Architecture**: Use HTML5 Drag and Drop API.
  - Custom MIME type: `application/helios-asset` (JSON: `{ id, type, url }`) for internal type-safe transfer.
  - Fallback MIME type: `text/plain` (URL string) for external sources or generic inputs.
- **AssetItem.tsx**:
  - `draggable={true}` on container.
  - `onDragStart`: Set both `application/helios-asset` and `text/plain`.
- **SchemaInputs.tsx**:
  - `AssetInput`:
    - Track `isDragOver` state.
    - `onDrop`: Parse custom type. If type matches prop type, accept. Else if generic text, accept.
  - `StringInput`:
    - `onDrop`: Accept `text/plain`.
- **PropsEditor.tsx**:
  - `PropInput`: For `type === 'string'`, add `onDrop` handling `text/plain`.

# Test Plan
- **Verification**:
  1. Start Studio with `npx helios studio`.
  2. Upload assets (Image, Audio).
  3. Drag Image to Image Prop -> Success.
  4. Drag Audio to Image Prop -> Ignored.
  5. Drag Image to String Prop -> Success.
  6. Drag external URL -> Success.
- **Success Criteria**: Dropping an asset updates the input value correctly and respects type constraints.
