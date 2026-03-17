#### 1. Context & Goal
- **Objective**: Implement drag and drop support for media assets directly onto the Timeline component.
- **Trigger**: The "Timeline Drag & Drop" feature is listed as a V1.x vision gap in `README.md` and `docs/prompts/planning-studio.md` but is missing from the Studio's Timeline implementation.
- **Impact**: Unlocks intuitive WYSIWYG editing workflows by allowing users to sequence media and audio directly on the timeline, matching standard NLE UX paradigms.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Add drag and drop event handlers `onDragOver`, `onDragLeave`, `onDrop` to the track area)
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` (to understand how to update composition inputs/assets state)

#### 3. Implementation Spec
- **Architecture**: Extend the React Timeline component to accept HTML5 drag and drop events.
- **Pseudo-Code**:
  - Add `onDragOver` handler to prevent default behavior and visualize drop state.
  - Add `onDragLeave` handler to clear visual drop state.
  - Add `onDrop` handler to:
    - Prevent default browser behavior (e.g., opening the file).
    - Determine the drop frame/time based on the cursor's X coordinate using existing frame calculation logic.
    - Parse `e.dataTransfer` for files or dragged asset data.
    - Auto-detect if the dropped item is Audio or Video.
    - Inject the new media configuration into the active composition's state.
- **Public API Changes**: None
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio` to verify the Timeline component still mounts and functions. Launch `npx helios studio` and verify dragging a media file onto the timeline track triggers the drop handler and updates the composition.
- **Success Criteria**: Dropping a valid media file onto the timeline correctly registers the asset at the specific drop time.
- **Edge Cases**: Dropping unsupported file types, dropping outside the track area, handling iframe boundary issues.
