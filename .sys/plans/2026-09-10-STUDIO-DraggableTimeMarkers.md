# 2026-09-10-STUDIO-DraggableTimeMarkers.md

## 1. Context & Goal
- **Objective**: Enable dragging of time-based input prop markers on the Timeline to directly update their values.
- **Trigger**: The current implementation of `TimecodeInput` props visualizes them as markers on the Timeline but only allows seeking (click), not editing (drag), which breaks the WYSIWYG promise.
- **Impact**: Users can intuitively adjust the timing of events (defined by props) directly on the timeline, rather than typing numbers in the side panel.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Implement drag logic for prop markers)
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` (Reference `controller` and `playerState`)

## 3. Implementation Spec
- **Architecture**:
  - Extend the existing `isDragging` state in `Timeline.tsx` to support a `'prop'` mode.
  - Introduce a `draggingPropKey` state to track which prop is being modified.
  - When dragging a prop marker:
    1. Calculate the target frame based on mouse position (snapping logic reused).
    2. Convert the frame to seconds (`frame / fps`).
    3. Call `controller.setInputProps()` with the new value.
  - Rely on the `controller`'s state update loop to reflect the new marker position (unidirectional data flow).

- **Pseudo-Code**:
  ```typescript
  // Timeline.tsx

  // Add 'prop' to drag types
  const [isDragging, setIsDragging] = useState<'playhead' | 'in' | 'out' | 'prop' | null>(null);
  const [draggingPropKey, setDraggingPropKey] = useState<string | null>(null);

  const handleMouseDown = (e, type, key?) => {
    // ...
    if (type === 'prop' && key) {
       setIsDragging('prop');
       setDraggingPropKey(key);
    }
  };

  // In useEffect for mousemove:
  if (isDragging === 'prop' && draggingPropKey) {
     const frame = ... // getFrameFromEvent
     const time = frame / fps;
     controller.setInputProps({ [draggingPropKey]: time });
  }

  // Update render:
  // <div className="timeline-marker-prop" style={{ cursor: 'ew-resize' }} onMouseDown={(e) => handleMouseDown(e, 'prop', prop.key)} ... />
  ```

- **Public API Changes**: None.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Create a composition with a schema containing a `number` prop with `format: 'time'`.
  3. Verify a marker appears on the timeline at the default time.
  4. Drag the marker.
  5. Verify the marker moves.
  6. Verify the value in the Props Editor updates in real-time.
- **Success Criteria**: Marker follows the mouse, and `inputProps` are updated.
- **Edge Cases**:
  - Dragging past duration (should clamp?).
  - Dragging below 0 (should clamp to 0).
  - Rapid updates (performance check).
  - Snapping behavior (should snap to grid/other markers if implemented).
