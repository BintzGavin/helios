#### 1. Context & Goal
- **Objective**: Implement visual resizing controls (handles) for the canvas bounding box in the Stage component.
- **Trigger**: The README lists "Canvas Controls - Zoom, resize, and toggle transparent backgrounds" as a feature of the Studio, but currently the canvas can only be resized via numeric input in the toolbar.
- **Impact**: Enhances the WYSIWYG editing experience by allowing users to easily drag and resize the canvas directly on the stage.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/studio/src/components/Stage/Stage.tsx` - Add a wrapper around the `<helios-player>` with drag handles for resizing. Add state and logic for drag interactions.
  - `packages/studio/src/components/Stage/Stage.css` - Add styles for the resize handles and the resizable container.
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`, `packages/studio/src/components/Stage/StageToolbar.tsx`

#### 3. Implementation Spec
- **Architecture**: Add a resizable wrapper element around the `<helios-player>`. The wrapper will have corner and/or edge handles (e.g., bottom-right). Use React's `onMouseDown`, `onMouseMove`, `onMouseUp` on the `document` to handle the dragging logic similar to how panning is handled. The resizing action will calculate the new dimensions and update `setCanvasSize` from the `StudioContext`.
- **Pseudo-Code**:
  - Add state for `isResizing` and `resizeStart`.
  - Add `handleResizeMouseDown(e, direction)` to start resizing.
  - Handle the drag calculation: calculate delta based on mouse movement divided by `zoom` (to ensure the resize delta matches visual scale). Update `canvasSize`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run dev -w packages/studio` or `npx helios studio` (if inside an example project).
- **Success Criteria**: The canvas displays visual handles. Dragging the handles resizes the canvas in real-time. The updated size is reflected in the StageToolbar inputs.
- **Edge Cases**: Resizing works correctly even when the canvas is zoomed or panned.
