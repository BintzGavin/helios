#### 1. Context & Goal
- **Objective**: Implement drag-and-drop support in the Timeline component for auto-detecting dragged assets (audio/video) and mapping them to appropriate composition schema props based on type/accept constraints.
- **Trigger**: Vision gap identified in `.jules/STUDIO.md` under `[0.117.0] - Timeline Drag & Drop Support`, referencing the README vision for timeline drag-and-drop functionality.
- **Impact**: Enables a more intuitive "WYSIWYG" editing experience by allowing users to directly drop assets from the Assets Panel onto the Timeline to update composition props.

#### 2. File Inventory
- **Create**: [None]
- **Modify**: `packages/studio/src/components/Timeline.tsx` - Add `onDrop`, `onDragOver`, and `onDragLeave` handlers to process dropped assets and update controller props. Add visual highlight styling support.
- **Modify**: `packages/studio/src/components/Timeline.css` - Add styling for visual feedback during drag-over (e.g., highlighting the timeline track area).
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` - To understand the payload format of the drag event.
- **Read-Only**: `packages/studio/src/components/SchemaInputs.tsx` - To review how `accept` constraints and types are evaluated for assets.

#### 3. Implementation Spec
- **Architecture**: Standard HTML5 Drag and Drop API integrated into React `onDrop` handlers within the Timeline track area.
- **Pseudo-Code**:
  - On drag over: prevent default and set a `dragOver` state to true.
  - On drag leave: set `dragOver` state to false.
  - On drop:
    - Prevent default, clear `dragOver` state.
    - Parse the asset payload from the data transfer.
    - If valid, iterate over `playerState.schema`.
    - Find the first prop definition where `type` matches the asset type (e.g., `'audio'`, `'video'`, `'image'`).
    - If multiple match, prioritize based on `accept` extensions if present.
    - Update the matching prop using the appropriate controller method (e.g., `controller.setInputProps`).
    - Show a toast notification indicating success or failure to find a matching prop.
  - Update CSS to add a visual highlight class to the timeline track area when dragging.
- **Public API Changes**: None. Internal component modifications only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Execute `npm test -w packages/studio src/components/Timeline.test.tsx` and run the studio via `npx helios studio` and manually drag an asset from the Assets panel to the timeline.
- **Success Criteria**:
  - The test passes verifying the prop update method is called with the correct mapped prop.
  - Manually dragging an audio asset to the timeline updates the composition's corresponding audio prop and triggers a visual change/toast.
- **Edge Cases**:
  - Dragging an asset type that is not defined in the schema (should show error/warning toast or fail silently).
  - Multiple props of the same type (should pick the first or prioritize based on `accept`).
  - Missing controller or schema.
