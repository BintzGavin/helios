# Plan: Studio Timeline Polish (Ruler, Snapping, Hover)

## 1. Context & Goal
- **Objective**: Upgrade the Timeline component from a simple progress bar to a professional NLE-style instrument with a time ruler, hover scrubbing guide, and magnetic snapping.
- **Trigger**: The README promises a "Visual timeline", but currently it lacks scalar context (ticks/ruler) and precision tools (snapping), acting more like a basic media player scrubber.
- **Impact**: Significantly improves navigation precision, allowing users to align the playhead with markers and specific time intervals accurately.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Implement ruler rendering, snapping logic, hover state)
- **Modify**: `packages/studio/src/components/Timeline.css` (Styles for ruler, ticks, hover guide)

## 3. Implementation Spec

### Architecture
- **Ruler System**:
  - Dynamically calculate `tickInterval` (in frames) based on current `zoom` and `fps`.
  - Render "Major Ticks" (with time labels) and "Minor Ticks" (lines only).
  - Use `framesToTimecode` for labels.
- **Hover Guide**:
  - Track `hoverFrame` state on `mousemove` over the track area.
  - Render a vertical dashed line and a timecode tooltip at the cursor position.
- **Magnetic Snapping**:
  - Define `SNAP_THRESHOLD_PX = 10`.
  - During drag (`playhead`, `in`, `out`), calculate distance to "Snap Points".
  - Snap Points include: `0` (Start), `totalFrames` (End), `inPoint`, `outPoint`, and all `markers`.
  - If `distance < SNAP_THRESHOLD`, clamp the value.
  - Allow bypassing snapping by holding `Shift`.

## 4. Test Plan
- **Verification**:
  - Run `npx helios studio` and verify UI interaction manually (Ruler zoom, Hover guide, Snap to markers).
  - Run `npm test -w packages/studio` to verify logic and prevent regressions.
- **Success Criteria**:
  1.  **Ruler**: Visible ticks appear above the track. Zooming changes the tick interval (e.g., from 10s to 1s).
  2.  **Hover**: Moving mouse over timeline shows a vertical line and timecode tooltip.
  3.  **Snapping**: Dragging snap to markers/in/out. Holding Shift disables this.
- **Edge Cases**:
  - Zoom level 0 (Fit) -> Ensure ticks don't overlap.
  - Short duration (< 1s) vs Long duration (> 1hr).
