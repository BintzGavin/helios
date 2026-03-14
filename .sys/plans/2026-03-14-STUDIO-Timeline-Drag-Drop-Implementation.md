#### 1. Context & Goal
- **Objective**: Implement drag and drop support for the Timeline to accept media assets (auto-detecting audio vs video) and map them into the composition.
- **Trigger**: The Studio V1 vision explicitly lists "Timeline Drag & Drop - Drag and drop media support (auto-detecting audio vs video) for the timeline, ensuring functionality within iframe environments" as a planned feature.
- **Impact**: Enhances the WYSIWYG editing experience by allowing users to add/replace media tracks intuitively by dragging assets directly from the Assets Panel onto the Timeline, mapping them to valid schema properties.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Add drag and drop event handlers and logic to map dropped media)
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (To understand the drag payload format: `application/helios-asset`)

#### 3. Implementation Spec
- **Architecture**:
  - Add `onDragOver`, `onDragLeave`, and `onDrop` handlers to the `timeline-container` div in `Timeline.tsx`.
  - On `dragOver`, if the payload includes `application/helios-asset`, prevent default to allow dropping.
  - On `drop`, extract the asset payload using `e.dataTransfer.getData('application/helios-asset')`.
  - Parse the payload to auto-detect the media type (e.g., matching `asset.type` like `'audio'` or `'video'`).
  - Search the `schema` (available via `playerState.schema` from `StudioContext`) for the first matching prop that accepts the media type (where `type === 'audio'` or `type === 'video'`, or where `type === 'string'` and `accept` array includes the asset type extension). If found, update `inputProps` via `controller.setInputProps({ ...inputProps, [matchedKey]: asset.url })`.
- **Pseudo-Code**:
  ```text
  function handleDragOver(event):
    if event data transfer types includes "application/helios-asset":
      prevent default behavior
      set drop effect to "copy"

  function handleDragLeave():
    reset visual state if applicable

  function handleDrop(event):
    prevent default behavior
    try:
      extract asset data from event data transfer
      if no data, return
      parse asset JSON

      targetPropertyKey = null
      for each property in schema:
        if property type matches asset type OR (property type is string AND property accept list includes asset type):
          targetPropertyKey = property key
          break

      if targetPropertyKey and controller exist:
        update input props with targetPropertyKey set to asset URL
        call controller setInputProps with updated props
      else:
        handle no matching property found

    catch error:
      log error
  ```
- **Public API Changes**: None.
- **Dependencies**: No pending dependencies.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio` to verify component test stability.
- **Success Criteria**:
  - Dropping an asset extracts the payload and invokes `controller.setInputProps()` mapped to a valid schema key, correctly setting the asset URL.
- **Edge Cases**:
  - Invalid drag payload.
  - Dropping when no matching prop exists in the schema.