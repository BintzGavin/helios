#### 1. Context & Goal
- **Objective**: Implement drag and drop support in the Timeline component to accept media assets (audio/video).
- **Trigger**: Vision gap "Timeline Drag & Drop" in `README.md` and `docs/prompts/planning-studio.md` specifies timeline drag and drop support for media.
- **Impact**: Enables users to directly add media to the timeline from the Assets panel via drag and drop, communicating with the underlying iframe environment to add the media to the composition.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Add drag-and-drop event handlers to the timeline track area.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - The Timeline UI needs to accept `onDragOver` and `onDrop` events.
  - When an asset from the Assets panel (`application/helios-asset`) is dropped onto the Timeline track area, the timeline should calculate the frame where it was dropped.
  - The Timeline must then communicate this action to the underlying composition. Since the composition is running inside an iframe, this involves using the `window.postMessage` API to send an `ADD_MEDIA` action to the preview iframe. The iframe should handle this message and add the media to the composition at the specified frame.
- **Pseudo-Code**:
  - In `Timeline.tsx`:
    - Add `onDragOver={(e) => e.preventDefault()}` to `.timeline-track-area`.
    - Add `onDrop={(e) => handleDrop(e)}` to `.timeline-track-area`.
    - In `handleDrop(e)`:
      - `e.preventDefault()`.
      - Extract asset data: `const assetData = e.dataTransfer.getData('application/helios-asset')`.
      - If no asset data, return.
      - Parse asset data to get `url`, `type` (audio/video), etc.
      - Calculate the drop frame using the current mouse X coordinate and `getFrameFromEvent(e)`.
      - Get the preview iframe using a ref or `document.querySelector('iframe')`.
      - Send message to the preview iframe window:
        `iframe.contentWindow.postMessage({ type: 'ADD_MEDIA', asset: parsedAsset, startFrame: dropFrame }, '*')`.
- **Public API Changes**: None expected in external API, but internal message passing or controller API might be needed to add the media.
- **Dependencies**: The preview iframe needs to know how to handle the `ADD_MEDIA` message event.

#### 4. Test Plan
- **Verification**: `npx helios studio`. Open a composition, drag an audio or video asset from the Assets panel onto the Timeline.
- **Success Criteria**: The asset is visually represented on the timeline (or at least handled by the logic) and added to the composition.
- **Edge Cases**: Dropping non-media assets (should be ignored). Dropping outside the track area. Calculating the correct start frame based on zoom/scroll.
