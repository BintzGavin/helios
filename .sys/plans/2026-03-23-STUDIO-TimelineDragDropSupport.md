#### 1. Context & Goal
- **Objective**: Implement drag and drop support for dragging assets from the Assets Panel onto the Timeline component.
- **Trigger**: The `.jules/STUDIO.md` journal notes that "Timeline Drag & Drop Support" is a vision feature that is currently missing from `Timeline.tsx`.
- **Impact**: Enables a faster WYSIWYG editing experience where users can drop audio or video assets onto the timeline to automatically update composition inputs.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Add drag-and-drop event handlers to accept asset drag payloads and map them to composition inputProps via `controller.setInputProps`.
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: To understand the payload format.
  - `packages/studio/src/context/StudioContext.tsx`: To use the `assets` list and `controller`.

#### 3. Implementation Spec
- **Architecture**: Use native HTML5 Drag and Drop events (`onDragOver`, `onDragLeave`, `onDrop`) on the `Timeline` container. When an asset is dropped, parse the asset id (investigate `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` and `AssetItem.tsx` to get the exact data transfer format), find it in the `assets` context, determine its type (e.g. `audio`, `video`), and update the relevant input prop in `controller.setInputProps` (investigate how schema validation or player properties define where asset URLs should be placed).
- **Pseudo-Code**:
  High level logic:
  - handleDragOver: preventDefault to show visual cue.
  - handleDrop: preventDefault, get asset identifier from dataTransfer (investigate exact string key), find asset in `assets` array. Find the first matching prop type in the composition schema (investigate how schema properties are defined), then `controller.setInputProps({ [propName]: assetProperty })` where assetProperty is the discovered URL field of the asset.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npx helios studio` and manually test dragging an asset from the Assets panel to the Timeline.
- **Success Criteria**: The timeline accepts the drop, and the corresponding input prop is updated with the asset's URL.
- **Edge Cases**: Dropping non-asset items, dropping when no suitable prop exists in the schema.
