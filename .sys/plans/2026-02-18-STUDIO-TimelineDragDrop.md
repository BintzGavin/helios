#### 1. Context & Goal
- **Objective**: Implement drag-and-drop support in the Timeline component to update the composition when an asset is dropped onto it.
- **Trigger**: The README specifies "Timeline Drag & Drop - auto-detecting audio/video and updating the composition when an asset is dragged to the timeline". This is currently missing from `Timeline.tsx` according to `.jules/STUDIO.md` and codebase review.
- **Impact**: Enhances WYSIWYG editing, making it intuitive to assign assets to a composition's props by dropping them directly on the timeline track.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Add drag event handlers to `.timeline-track-area` to parse `application/helios-asset` payload and update `controller.setInputProps`).
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (to understand drag payload format), `packages/studio/src/context/StudioContext.tsx` (to understand `playerState.schema` and `controller`).

#### 3. Implementation Spec
- **Architecture**:
  - Add a state variable `isDragOver` to visually highlight the `.timeline-track-area` when an item is dragged over it.
  - Implement `onDragOver` and `onDragLeave` to manage the visual state.
  - Implement `onDrop`:
    - Parse the asset JSON payload from the data transfer.
    - Inspect the composition's `schema` to find a suitable property that accepts the dragged asset's URL. The heuristic should look for `string` types that might represent URIs or whose keys match the asset type (e.g. 'audio' or 'video').
    - If a suitable property is found, update the composition state by calling `controller.setInputProps` with the new asset URL.
- **Pseudo-Code**:
  - Initialize `isDragOver` state to false
  - Define handleDragOver: prevent default, set `isDragOver` to true
  - Define handleDragLeave: set `isDragOver` to false
  - Define handleDrop:
    - prevent default, set `isDragOver` to false
    - extract 'application/helios-asset' data
    - if data exists, parse JSON to asset object
    - find a target property in `schema` where:
      - property type is string
      - AND (property key includes asset.type OR property format is 'uri'/'url')
    - if target property found, call `controller.setInputProps` mapping target property to `asset.url`
  - Attach handlers to the timeline track area container
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run dev` and test dropping an audio/video asset from the Assets panel onto the Timeline to see if the timeline track updates and the composition's `inputProps` change. Also, verify with a component test that the drop handler correctly identifies a schema prop and calls the update method.
- **Success Criteria**: Dropping a valid asset applies its URL to an applicable property in the composition and updates the player. Visual feedback (`drag-over` class) works.
- **Edge Cases**: Dropping non-asset items (should be ignored), dropping an asset when no matching property exists in the schema (should be ignored or show a toast).
