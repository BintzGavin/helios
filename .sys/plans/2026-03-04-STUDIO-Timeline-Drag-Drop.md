#### 1. Context & Goal
- **Objective**: Implement native HTML drag-and-drop media support (auto-detecting audio vs video) for the Studio Timeline, allowing users to drop assets directly into the composition.
- **Trigger**: "Timeline Drag & Drop" is documented as a missing planned feature in `docs/prompts/planning-studio.md` vision gaps.
- **Impact**: Enables a WYSIWYG workflow for adding media assets, significantly improving the IDE experience.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Add native `onDragOver` and `onDrop` handlers to the main timeline container).
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`, `packages/studio/src/components/AssetsPanel/AssetItem.tsx`.

#### 3. Implementation Spec
- **Architecture**: The `AssetsPanel` already implements drag-and-drop by setting `e.dataTransfer.setData('application/helios-asset', JSON.stringify(asset))`. We need to add an `onDrop` event listener to the main `Timeline` container that parses this payload. Upon drop, the handler will calculate the exact frame/time based on the cursor's X coordinate (accounting for scroll position and `pixelsPerFrame`). It will then auto-detect if the dropped `Asset` is `audio` or `video` using its `type` property. Finally, it uses the `HeliosController` to inject the asset into the composition (typically by updating `inputProps` based on the schema, appending the media object with the computed `startTime`). To ensure functionality within iframe environments, we listen for drops on the parent `div.timeline-tracks` instead of the `<helios-player>`.
- **Pseudo-Code**:
  - In `Timeline.tsx`:
    - Add `onDragOver` to `div.timeline-tracks`: `e.preventDefault(); if (e.dataTransfer.types.includes('application/helios-asset')) e.dataTransfer.dropEffect = 'copy';`
    - Add `onDrop` to `div.timeline-tracks`:
      - `e.preventDefault()`
      - `const data = e.dataTransfer.getData('application/helios-asset')`
      - Parse JSON data.
      - Calculate drop X: `e.clientX - rect.left + timelineScrollRef.current.scrollLeft`
      - Calculate drop time: `(dropX / pixelsPerFrame) / fps`
      - Inspect `schema` from `StudioContext` to find matching array props for audio/video (e.g., checking if the item schema accepts `audio` or `video` format/type).
      - Update `inputProps` via `controller.setInputProps()` to append the new media item with `{ url: asset.url, startTime: dropTime }`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/studio` to verify existing Timeline tests pass.
  - Test via UI by starting `npx helios studio`, dragging an audio and a video asset from the Assets panel to the timeline tracks, and verifying `inputProps` is updated correctly.
- **Success Criteria**: Dropping an asset onto the timeline tracks successfully parses the `application/helios-asset` data and triggers an `inputProps` update at the calculated time.
- **Edge Cases**: Dropping non-asset data, calculating time while scrolled, schema missing compatible media arrays.