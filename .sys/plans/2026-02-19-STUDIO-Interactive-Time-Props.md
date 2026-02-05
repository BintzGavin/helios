# Interactive Time-based Props on Timeline

#### 1. Context & Goal
- **Objective**: Make time-based prop markers on the timeline draggable, allowing users to adjust timing directly in the visual timeline.
- **Trigger**: "WYSIWYG" gap. Currently, time-based props (defined in schema with `format: 'time'`) are visualized as markers on the timeline but are read-only (clicking only seeks). Users must use the Props Editor to change values, breaking the visual editing flow.
- **Impact**: Enhances the Studio experience by enabling direct manipulation of timing parameters (e.g., animation start times, event triggers) on the timeline, aligning with the "Browser-based development environment" vision.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` - Implement drag logic for prop markers.
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` - Reference for `controller` and `inputProps` access.

#### 3. Implementation Spec
- **Architecture**: Extend the existing `isDragging` state in `Timeline.tsx` to support a union type including prop identification. Implement a unified drag handler that updates the `HeliosController` input props when a prop marker is dragged.
- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/components/Timeline.tsx

  // 1. Update state type
  type DragState =
    | { type: 'playhead' }
    | { type: 'in' }
    | { type: 'out' }
    | { type: 'prop', key: string }; // New

  const [isDragging, setIsDragging] = useState<DragState | null>(null);

  // 2. Update handleMouseDown
  // Change signature to accept DragState
  const handleMouseDown = (e: React.MouseEvent, dragType: DragState) => {
    e.preventDefault();
    setIsDragging(dragType);
  }

  // 3. Update mouse move handler in useEffect
  // Inside existing mousemove listener:
  const handleMouseMove = (e: MouseEvent) => {
      // ... existing playhead/in/out logic ...

      if (isDragging.type === 'prop') {
        const rawFrame = getFrameFromEvent(e);
        const frame = e.shiftKey ? rawFrame : getSnapFrame(rawFrame);

        // Convert to seconds (schema expects seconds for 'time' format usually,
        // but verify if TimecodeInput uses frames or seconds.
        // Based on StudioContext markers logic, it seems to be seconds.)
        const time = frame / fps;

        // Update props via controller
        // This will trigger a round-trip update: Controller -> Iframe -> PlayerState -> StudioContext -> Timeline
        if (inputProps && inputProps[isDragging.key] !== time) {
            const newProps = { ...inputProps, [isDragging.key]: time };
            controller.setInputProps(newProps);
        }
      }
  }
  ```
- **Dependencies**: None.
- **Constraints**:
  - Must respect `fps` when converting frame <-> time.
  - Must ensure `controller` exists before calling `setInputProps`.
  - Prop updates should be efficient (React batching usually handles this, but `setInputProps` sends postMessage).

#### 4. Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio`
  2. Create/Open a composition that uses a time prop.
     - Example Schema: `{ "animStart": { "type": "number", "format": "time", "default": 2 } }`
  3. Locate the "animStart" marker on the timeline (should be at 2s).
  4. Drag the marker to 4s.
  5. **Success Criteria**:
     - Marker moves smoothly with the mouse.
     - Value in "Props Editor" panel updates to 4.0.
     - Playback behavior respects the new time.
- **Edge Cases**:
  - Dragging past duration (should clamp).
  - Dragging past 0 (should clamp).
  - Dragging while playing (should still work).
