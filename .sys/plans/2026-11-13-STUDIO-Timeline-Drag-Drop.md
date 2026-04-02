#### 1. Context & Goal
- **Objective**: Implement drag and drop support for the Timeline to accept assets (audio/video).
- **Trigger**: Vision gap identified in README and .jules/STUDIO.md (Timeline Drag & Drop Support).
- **Impact**: Enables users to intuitively add media to their composition by dragging from the Assets Panel directly to the Timeline.

#### 2. File Inventory
- **Create**: []
- **Modify**: [packages/studio/src/components/Timeline.tsx - Add drag and drop event handlers]
- **Read-Only**: [packages/studio/src/components/AssetsPanel/AssetItem.tsx, packages/studio/src/context/StudioContext.tsx]

#### 3. Implementation Spec
- **Architecture**: Use native HTML5 Drag and Drop API. `AssetItem` already sets `application/helios-asset` data. The `Timeline` component needs `onDragOver` and `onDrop` handlers to parse this data and update the composition (e.g., via `controller.setInputProps`).
- **Pseudo-Code**:
  - Add `onDragOver={(e) => e.preventDefault()}` to timeline container.
  - Add `onDrop` handler that reads `e.dataTransfer.getData('application/helios-asset')`.
  - Parse the asset JSON.
  - Determine the drop time based on mouse X coordinate relative to timeline width and total duration.
  - Match asset type to schema constraints and use `controller.setInputProps` to update the composition.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio` to verify that tests still pass, then manually verify using `npx helios studio`.
- **Success Criteria**: Dropping an audio/video asset on the timeline successfully updates the composition state and visualizes the new element at the correct time.
- **Edge Cases**: Dropping unsupported asset types, dropping outside the active timeline bounds.
