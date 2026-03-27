#### 1. Context & Goal
- **Objective**: Implement drag-and-drop support for assets directly onto the Timeline component.
- **Trigger**: Vision gap identified in `.jules/STUDIO.md` where drag-and-drop functionality from the Assets Panel to the Timeline is missing.
- **Impact**: Enables a more intuitive, WYSIWYG editing experience by allowing users to drag audio, video, or image assets from the Assets panel and drop them directly onto the Timeline, which should automatically map to schema properties if they match the accepted types.

#### 2. File Inventory
- **Create**: [] (No new files needed)
- **Modify**: `packages/studio/src/components/Timeline.tsx`
  - Add drag event handlers (`onDragOver`, `onDragLeave`, `onDrop`) to the main `.timeline` container or a specific drop zone within the Timeline.
  - Implement logic to intercept `onDrop`, parse the dragged asset data (`application/helios-asset`), check the composition `schema` for an appropriate property that accepts the asset's type, and update the `inputProps` via the controller.
- **Modify**: `packages/studio/src/components/Timeline.css` (Optional)
  - Add styles for a visual drop indicator (e.g., `timeline-drag-over` class) to provide visual feedback during drag events.
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`
  - To understand how to update `inputProps` via `controller.setInputProps`.
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx`
  - To understand the drag payload format (`application/helios-asset`).

#### 3. Implementation Spec
- **Architecture**: Use native HTML5 Drag and Drop API.
- **Pseudo-Code**:
  - Add state for tracking drag over status.
  - Create `handleDragOver` to accept only `application/helios-asset` data.
  - Create `handleDragLeave` to reset drag status.
  - Create `handleDrop` to parse the asset JSON payload, iterate through the composition's schema definitions to find the first property of type `asset` that accepts the dropped asset's type (e.g., `image`, `video`, `audio`), and if a match is found, call `controller.setInputProps` to assign the asset URL to that property key.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npx helios studio`, open a composition with asset schema props, and drag an asset from the Assets panel to the Timeline. Verify that the composition updates.
- **Success Criteria**: Dropping a matching asset updates the relevant property in the composition's input props.
- **Edge Cases**: Dropping an asset when no matching schema property exists (should safely ignore or warn). Dropping unsupported file types.
