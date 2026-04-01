# 1. Context & Goal
- **Objective**: Implement drag-and-drop support for dragging assets from the Assets Panel and dropping them onto the Timeline track area to automatically assign them to schema-aware input properties.
- **Trigger**: Vision gap identified in `README.md` ("Timeline Drag & Drop" feature) and `.jules/STUDIO.md` ("auto-detecting audio/video and updating the composition").
- **Impact**: Enhances the "IDE-like" WYSIWYG experience by allowing visual composition construction directly from the Assets Panel.

# 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Add drag-and-drop event handlers to the track area)
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (to verify the data transfer payload format), `packages/studio/src/context/StudioContext.tsx`

# 3. Implementation Spec
- **Architecture**:
  - The `AssetItem` component sets drag data with `application/helios-asset` containing a JSON stringified `Asset` object.
  - Add `onDragOver`, `onDragLeave`, and `onDrop` handlers to the `Timeline` component's `.timeline-track-area` div.
  - Upon dropping an asset, the Timeline will parse the data and inspect the current `playerState.schema`.
  - It will attempt to find an appropriate `inputProp` key to update by checking `accept` constraints (e.g. `'audio/*'`, `'video/*'`, `'image/*'`) or key names against the asset's `type`.
  - Update the controller using `controller.setInputProps({ [matchedKey]: asset.url })`.

- **Pseudo-Code**:
  - Add state: `const [isDragOverTimeline, setIsDragOverTimeline] = useState(false);`
  - In `handleDragOver(e)`: `e.preventDefault()`, `setIsDragOverTimeline(true)`.
  - In `handleDragLeave(e)`: `setIsDragOverTimeline(false)`.
  - In `handleDrop(e)`:
    - `e.preventDefault()`, `setIsDragOverTimeline(false)`.
    - `const data = e.dataTransfer.getData('application/helios-asset');`
    - `if (!data) return;`
    - `const asset = JSON.parse(data);`
    - Let `matchedKey = null;`
    - Loop over `Object.entries(schema)`:
      - If `asset.type` is 'audio', match if `def.accept === 'audio/*'` or `key.toLowerCase().includes('audio')`.
      - If `asset.type` is 'video', match if `def.accept === 'video/*'` or `key.toLowerCase().includes('video')`.
      - If `asset.type` is 'image', match if `def.accept === 'image/*'` or `key.toLowerCase().includes('image')`.
    - If `matchedKey`, call `controller?.setInputProps({ [matchedKey]: asset.url });`
  - Add visual indication class to `.timeline-track-area` when `isDragOverTimeline` is true.

- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm run test -w packages/studio` to verify existing tests pass. Manually run `npx helios studio` and drag an asset from the Assets Panel onto the Timeline to confirm the input property updates in the UI.
- **Success Criteria**:
  - Assets can be dragged and dropped onto the Timeline.
  - Dropping updates the correct `inputProps` key based on schema type mapping.
- **Edge Cases**:
  - Dropping when no matching schema property exists (should gracefully ignore).
