#### 1. Context & Goal
- **Objective**: Implement drag and drop support in the Timeline component to auto-detect audio/video assets from the Assets Panel and update composition schema props.
- **Trigger**: The README specifies "Timeline Drag & Drop" as a vision feature, but the `Timeline.tsx` is currently missing the `onDrop` handlers to receive dragged assets.
- **Impact**: Brings the Studio closer to a complete WYSIWYG experience and satisfies the missing "Timeline Drag & Drop" feature highlighted in the backlog and `.jules/STUDIO.md` learnings.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` - Add drag and drop event handlers (`onDragOver`, `onDragLeave`, `onDrop`) to process dropped assets and update schema `inputProps`.
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` - Provides `controller` (for `setInputProps`), `playerState` (for `schema` and `inputProps`).
- **Read-Only**: `packages/core/src/schema.ts` - Used to understand schema definition constraints (e.g. `accept`).
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` - Check how assets set data during drag (e.g., `application/helios-asset` and `application/helios-asset-id`).

#### 3. Implementation Spec
- **Architecture**:
  - Add state variables `isDragOver` (boolean) to `<Timeline>`.
  - Add standard event handlers (`handleDragOver`, `handleDragLeave`, `handleDrop`) to the main `timeline-content` or `timeline-track-area` container.
  - In `handleDragOver`: Prevent default, check if dragging a valid `application/helios-asset` or string, allow copy effect, update `isDragOver` state.
  - In `handleDrop`:
    1. Parse the dropped asset from `application/helios-asset`.
    2. Determine the asset type (e.g., 'audio', 'video').
    3. Iterate through `playerState.schema` to find the first matching prop that accepts the asset's type or file extension (based on `schema[key].type` and `schema[key].accept`).
    4. Calculate the drop time based on the X coordinate (`clientX` -> frame -> time in seconds).
    5. Update `inputProps` via `controller.setInputProps({ [matchedKey]: assetUrl })`.
    6. If a time prop is related (e.g., `[matchedKey]Time`), update it with the calculated drop time.
- **Pseudo-Code**:
  ```pseudo
  Define state: isDragOver (boolean)

  function handleDragOver(event):
    prevent default behavior
    if event contains 'application/helios-asset':
      set drop effect to copy
      set isDragOver to true

  function handleDragLeave():
    set isDragOver to false

  function handleDrop(event):
    prevent default behavior
    set isDragOver to false

    extract asset from event data 'application/helios-asset'
    if extraction fails, return

    calculate drop location based on event coordinates and content bounds
    convert drop location to dropFrame and dropTime based on timeline properties

    find target schema prop:
      loop through playerState.schema properties:
        if prop matches asset type OR prop accepts asset file extension:
           targetProp = current prop key
           if a matching time prop exists (e.g., key + 'Time'):
              targetTimeProp = matching time prop key
           break loop

    if targetProp found:
       prepare updates payload: set targetProp to asset URL
       if targetTimeProp found:
          add targetTimeProp to payload, set to dropTime
       call controller.setInputProps with updates payload
    else:
       show warning toast "No compatible prop found in schema"
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run dev -w packages/studio`. Open Studio UI, load a composition with an audio/video prop in the schema. Open Assets Panel, drag an audio/video asset onto the Timeline.
- **Success Criteria**: The `inputProps` for the matched schema key update with the asset URL, and the corresponding time prop updates based on the drop location.
- **Edge Cases**: Dropping an asset when no compatible schema prop exists (should fail gracefully/show warning). Dropping an unsupported file format.
