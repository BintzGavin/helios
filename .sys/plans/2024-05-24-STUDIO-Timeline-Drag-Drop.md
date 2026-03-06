#### 1. Context & Goal
- **Objective**: Implement drag and drop media support for the timeline, auto-detecting audio vs video, and ensuring functionality within iframe environments.
- **Trigger**: Vision Gap - README mentions "Timeline Drag & Drop" as a planned feature which is currently missing.
- **Impact**: Enhances the Studio experience by allowing users to compose and manage media efficiently through the visual timeline.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/TimelineDropZone.tsx` (Provides an overlay to intercept drops over the timeline area)
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx` (Add drag and drop event handlers)
  - `packages/studio/src/components/Timeline.css` (Visual feedback during drag events)
  - `packages/studio/src/context/StudioContext.tsx` (Handle media additions through dropping into the timeline state)
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` (Check how draggable assets are structured)
  - `packages/player/src/HeliosController.ts`

#### 3. Implementation Spec
- **Architecture**: The `Timeline` component will implement drag-and-drop zones to receive assets. When a drag event starts (either from the OS or `AssetsPanel`), a transparent overlay (`TimelineDropZone`) covers the timeline to prevent the `<helios-player>` iframe from intercepting the event. The drop handler identifies the media type (audio vs video) based on file extension or asset metadata. Dropped items are then registered via the `controller` or `inputProps` based on the targeted frame position.
- **Pseudo-Code**:
  - In `Timeline.tsx`: Add state `isDragOver`. Implement `onDragOver` (with `e.preventDefault()`) and `onDrop`.
  - In `onDrop`: Parse `e.dataTransfer` for asset metadata. Calculate the target frame using the drop coordinates relative to the timeline width.
  - Dispatch an event or update `inputProps` (e.g., adding an audio track object with `src` and `startTime`) to reflect the dropped media at the specific timecode.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run dev` in `packages/studio`. Drag an audio file and a video file from the Assets panel onto the Timeline.
- **Success Criteria**: The timeline accepts the drop, correctly identifies the media type, calculates the correct frame timecode, and updates the composition's input props accordingly without the iframe swallowing the event.
- **Edge Cases**: Dragging unsupported files, dropping outside the timeline, handling multiple dropped files simultaneously.
