#### 1. Context & Goal
- **Objective**: Implement drag and drop support for the Timeline to accept media assets (auto-detecting audio vs video) and map them into the composition, ensuring functionality within iframe environments.
- **Trigger**: The Studio V1 vision explicitly lists "Timeline Drag & Drop - Drag and drop media support (auto-detecting audio vs video) for the timeline, ensuring functionality within iframe environments" as a planned feature.
- **Impact**: Enhances the WYSIWYG editing experience by allowing users to add/replace media tracks intuitively by dragging assets directly from the Assets Panel onto the Timeline, mapping them to valid schema properties.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Add drag and drop event handlers and logic to map dropped media)
- **Read-Only**: `packages/player/src/controllers.ts` (Verify `HeliosController.setInputProps` interface)

#### 3. Implementation Spec
- **Architecture**:
  - Add `onDragOver`, `onDragLeave`, and `onDrop` handlers to the `timeline-content` div in `Timeline.tsx`.
  - Introduce an `isDragOverTimeline` state to provide visual feedback (e.g., adding a CSS class or an overlay) while an asset is dragged over the timeline.
  - On `drop`, extract the asset payload (using `e.dataTransfer.getData('application/json')` or `'text/plain'` depending on the draggable implementation).
  - Parse the payload to auto-detect the media type (e.g., matching `asset.type` like `'audio'` or `'video'`).
  - Calculate the drop time based on `e.clientX`, the timeline's bounding rect, current zoom, and pan context using the existing `getFrameFromEvent(e) / fps` logic.
  - Search the `schema` (available via `playerState.schema`) for the first matching prop that accepts the media type. If found, update `inputProps` via `controller.setInputProps({ ...inputProps, [matchedKey]: asset.url })`.
  - *Iframe Handling*: Ensure that while dragging occurs over the iframe (`helios-player`), it does not swallow the events. This may require CSS `pointer-events: none` on the player iframe overlay when a global drag state is active, though handling the drop directly on the `Timeline` area avoids iframe boundaries entirely as long as the user drops on the timeline itself.
- **Pseudo-Code**:
  ```tsx
  // Inside Timeline.tsx

  const [isDragOverTimeline, setIsDragOverTimeline] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverTimeline(true);
  };

  const handleDragLeave = () => {
    setIsDragOverTimeline(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverTimeline(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const asset = JSON.parse(data); // Expects Asset interface

      const dropFrame = getFrameFromEvent(e);
      const dropTime = dropFrame / fps;

      // Find suitable prop in schema based on asset.type
      let targetPropKey = null;
      for (const [key, def] of Object.entries(schema)) {
         if (def.type === 'string' && def.accept?.includes(asset.type)) {
            targetPropKey = key;
            break;
         }
      }

      if (targetPropKey && controller) {
        controller.setInputProps({ ...inputProps, [targetPropKey]: asset.url });
        // Optionally, if we have another prop to set the start time for this asset
      }

    } catch (err) {
      console.error('Failed to parse dropped asset', err);
    }
  };

  // Add handlers to the timeline-content div:
  // onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
  ```
- **Public API Changes**: None.
- **Dependencies**: No pending dependencies.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/studio` to verify component test stability, and load the Studio via `npx helios studio`.
- **Success Criteria**:
  - Dragging an asset over the timeline updates visual state.
  - Dropping an asset extracts the payload and invokes `controller.setInputProps()` mapped to a valid schema key.
- **Edge Cases**:
  - Invalid drag payload (not JSON, not an asset).
  - Dropping when no matching prop exists in the schema (should fail gracefully with a toast or console warning).
