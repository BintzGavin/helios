#### 1. Context & Goal
- **Objective**: Implement drag and drop media support (Timeline Drag & Drop) for the Timeline component.
- **Trigger**: The README states "Timeline Drag & Drop - Drag and drop media support (auto-detecting audio vs video) for the timeline, ensuring functionality within iframe environments" which is currently a documented vision gap.
- **Impact**: Enables a more intuitive WYSIWYG editing experience by allowing users to drag assets directly onto the timeline from the Assets panel. It will automatically update the correct composition input property based on the dropped asset's type.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` - Add drag and drop event handlers (`onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`) to the `.timeline-track-area` or `.timeline-content` element. Implement the drop logic to detect the asset type and match it to a relevant input property defined in the schema.
- **Modify**: `packages/studio/src/components/Timeline.css` - Add styling for visual feedback during the drag operation (e.g., highlighting the timeline area).
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` - For accessing `playerState.schema`, `controller`, and `inputProps`.

#### 3. Implementation Spec
- **Architecture**:
  - The `AssetItem` component already sets `application/helios-asset` data containing the asset object (with `type` and `url`).
  - Add drag handlers to `Timeline.tsx`'s `.timeline-track-area`.
  - On `dragOver`, prevent default to allow the drop and set a state `isDragOverTimeline` to true to apply a CSS class.
  - On `dragLeave`, set `isDragOverTimeline` to false.
  - On `drop`:
    - Prevent default.
    - Set `isDragOverTimeline` to false.
    - Extract `application/helios-asset` data and parse it.
    - If valid asset data is found, inspect `playerState.schema`.
    - To auto-detect audio vs video/image, match the asset's `type` (e.g., 'audio', 'video', 'image') against the schema definitions:
      - Look for schema properties of type `string` where `accept` explicitly matches `audio/*`, `video/*`, `image/*` respectively.
      - If no exact `accept` match, fall back to matching the key name (e.g., key contains 'audio', 'video', 'image', 'url', 'src').
    - If a matching schema key is found, update the controller's input props: `controller.setInputProps({ [matchedKey]: assetUrl })`.
- **Pseudo-Code**:
    - Define drop handler function:
    - Get asset payload string from data transfer event.
    - If payload exists, parse it into an asset object.
    - If the controller has an active schema:
      - Iterate through schema properties to find the best match for the asset type.
      - If the asset is an audio file, look for a property that accepts audio or has "audio" in the name.
      - If the asset is a video file, look for a property that accepts video or has "video" in the name.
      - If the asset is an image file, look for a property that accepts image or has "image" in the name.
      - If a suitable property is found, update the controller's input properties with the new asset URL.

- **Dependencies**: None.
- **Public API Changes**: None.

#### 4. Test Plan
- **Verification**: Start the Studio server (`npm run dev` in `packages/studio`), open a composition that accepts an audio/video prop. Drag an asset from the Assets Panel and drop it on the Timeline track area. Verify that the relevant input prop in the Props Editor updates and the preview updates.
- **Success Criteria**:
  - Visual indication when an asset is dragged over the timeline.
  - Dropping an asset automatically assigns its URL to the most appropriate input property (distinguishing audio from video).
- **Edge Cases**:
  - No matching schema property found (should fail gracefully).
  - Dropping non-asset items (e.g., simple text) (should ignore).
