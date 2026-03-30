#### 1. Context & Goal
- **Objective**: Implement drag-and-drop support for assets on the Timeline.
- **Trigger**: A vision gap documented in `.jules/STUDIO.md` under `[0.117.0] - Timeline Drag & Drop Support`, noting that dragging assets to the timeline should auto-detect and update the composition based on schema `accept` constraints.
- **Impact**: Enhances the WYSIWYG editing experience by making asset assignment to time-based or media inputs intuitive and visual, closing a gap between the documented vision and current implementation.

#### 2. File Inventory
- **Create**: None.
- **Modify**: `packages/studio/src/components/Timeline.tsx` - Add drag-and-drop event handlers to receive assets and map them to compatible schema inputs. Add CSS classes to `Timeline.css` for drag feedback.
- **Read-Only**: `packages/studio/src/components/Timeline.test.tsx`, `packages/studio/src/context/StudioContext.tsx`

#### 3. Implementation Spec
- **Architecture**: Standard React drag-and-drop events (`onDragOver`, `onDragLeave`, `onDrop`) will be added to the `.timeline-track-area` in `Timeline.tsx`. The `onDrop` handler will parse the transferred asset data (set by `AssetsPanel` items as `application/json` representing an `Asset`).
- **Pseudo-Code**:
    1.  Add `isDragOver` state to `Timeline.tsx`.
    2.  Add `onDragOver` handler to `.timeline-track-area`: Prevent default to allow dropping, set `isDragOver = true`.
    3.  Add `onDragLeave` handler: set `isDragOver = false`.
    4.  Add `onDrop` handler:
        - Prevent default, set `isDragOver = false`.
        - Extract JSON payload from `e.dataTransfer.getData('application/json')`.
        - Parse the `Asset` object.
        - Iterate through `playerState.schema` properties. Find the first property of type `'asset'` where the `accept` array includes the dragged asset's `type` (e.g., `'audio'` or `'video'`).
        - If a compatible property is found, call `controller.setInputProps({ [propKey]: asset.relativePath })` and optionally show a success toast.
        - If no compatible property exists, show a warning toast indicating no compatible input was found for that asset type.
- **Public API Changes**: None.
- **Dependencies**: Relies on `AssetItem` components correctly setting `e.dataTransfer.setData('application/json', JSON.stringify(asset))`.

#### 4. Test Plan
- **Verification**: Run `npm run dev -w packages/studio` (or `npx tsx packages/cli/src/index.ts studio`).
- **Success Criteria**:
    1. Dragging an audio/video asset from the Assets Panel over the Timeline shows visual feedback (e.g., border highlight).
    2. Dropping an audio asset auto-assigns its `relativePath` to the first schema input that accepts `'audio'` (like `audioUrl` in some examples).
    3. Dropping an incompatible asset (e.g., dragging a video when the schema only accepts audio) shows a toast message and does not update props.
- **Edge Cases**: Dropping non-asset text or invalid JSON should be handled gracefully without crashing.
