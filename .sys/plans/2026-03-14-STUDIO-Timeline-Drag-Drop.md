#### 1. Context & Goal
- **Objective**: Implement Timeline Drag & Drop support to allow users to drag media assets (audio/video) from the Assets Panel and drop them directly onto the timeline to automatically configure them.
- **Trigger**: The "Timeline Drag & Drop" feature is listed as a vision gap in `docs/prompts/planning-studio.md` but is missing from the current `Timeline` component implementation.
- **Impact**: Improves the Studio editing experience by making asset assignment to the timeline intuitive and visual.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx` (Add onDrop handlers)
  - `packages/studio/src/components/Timeline.test.tsx` (Add tests for drag & drop)
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` (To understand drag payload format)

#### 3. Implementation Spec
- **Architecture**: The `Timeline` component needs an `onDrop` and `onDragOver` handler to accept `asset` data from the internal `AssetsPanel` (via dataTransfer). Upon dropping, it should identify the asset type. If it's audio, it should add/update an audio prop or track. The dropped X-coordinate on the timeline will be translated to a frame number using `getFrameFromEvent(e)` to set the `startTime` of the asset if applicable.
- **Pseudo-Code**:
  - Add `onDragOver={(e) => e.preventDefault()}` to `.timeline-track-area` in `Timeline.tsx`.
  - Add `onDrop={(e) => { ... }}` to parse `e.dataTransfer.getData('application/json')`.
  - Calculate the frame dropped on using `getFrameFromEvent(e)`.
  - If the dropped asset is audio/video, attempt to match it with an `inputProp` in the schema that accepts that asset type, or dispatch an event to add it to an audio track via `controller.setAudioTracks`. Update the composition `inputProps` accordingly using `controller.setInputProps`.
- **Public API Changes**: None
- **Dependencies**: Depends on the `HeliosSchema` exposing which props accept audio/video to intelligently assign the dropped asset, and `AssetsPanel` providing the correct drag payload.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio`
- **Success Criteria**: Timeline accepts drag-and-drop events, correctly identifies the dropped asset data from `dataTransfer`, calculates the correct drop frame, and updates the `StudioContext`/`controller` state.
- **Edge Cases**: Dropping non-media assets, dropping when no matching props exist in schema, dropping outside the track area.
