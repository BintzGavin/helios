# Plan: Visualize Time-based Props on Timeline

## 1. Context & Goal
- **Objective**: Enhance the Studio's WYSIWYG capabilities by visualizing time-based input props (annotated with `format: 'time'`) directly on the Timeline and providing a Timecode input in the Props Editor.
- **Trigger**: Vision gap - "WYSIWYG editing experience". Currently, props controlling timing (e.g., "Start Time") are abstract numbers in the sidebar, making synchronization difficult.
- **Impact**: Enables users and agents to visually correlate input props with the timeline, improving precision and usability for time-sensitive effects.
- **Blocker**: `packages/studio/package.json` depends on `@helios-project/player` `^0.65.0`, but the workspace version is `0.66.2`. This causes `npm install` to fail. This must be fixed before implementation.

## 2. File Inventory
- **Create**: `packages/studio/src/components/Controls/TimecodeInput.tsx` (New component for editing time values as HH:MM:SS:FF)
- **Create**: `packages/studio/src/components/Controls/TimecodeInput.css` (Styles for TimecodeInput)
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx` (Integrate TimecodeInput for number props with `format: 'time'`)
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Render markers for time-based props)
- **Modify**: `packages/studio/src/components/Timeline.css` (Styles for new markers)
- **Modify**: `packages/studio/package.json` (Fix dependency version mismatch)

## 3. Implementation Spec

### Architecture
- **TimecodeInput**: A reusable component wrapping an input field.
  - Accepts `value` (number, seconds), `fps` (number), `onChange` (val: number).
  - Uses `framesToTimecode` for display and `timecodeToFrames` (or regex parsing) for input.
  - Handles focus/blur to switch between editing and formatted display if needed, or just strict masking.
- **SchemaInputs**:
  - In `NumberInput` section: check if `definition.format === 'time'`.
  - If true, render `TimecodeInput` instead of `NumberRangeInput`.
  - Pass the current FPS from `StudioContext` (via `useStudio`) to the input.
- **Timeline**:
  - In `Timeline.tsx`, access `playerState.schema` and `playerState.inputProps`.
  - Iterate through schema properties.
  - Filter for `type: 'number'` and `format: 'time'`.
  - Retrieve corresponding value from `inputProps`.
  - Render a visual marker (e.g., a cyan diamond `.timeline-marker-prop`) at the calculated frame.
  - Add tooltips showing the Prop Label.
  - Implement click-to-seek functionality for these markers.

### Public API Changes
- None (internal UI changes only).

### Dependencies
- `@helios-project/core` for timecode utilities (`framesToTimecode`).
- `StudioContext` for accessing `fps`.

## 4. Test Plan
- **Verification**:
  1.  Fix `packages/studio/package.json` dependency.
  2.  Create a temporary composition schema with a prop: `{ "triggerTime": { "type": "number", "format": "time", "default": 2 } }`.
  3.  Run `npx helios studio`.
  4.  Verify **Props Editor** shows a Timecode input (e.g., "00:00:02:00" @ 30fps) instead of "2".
  5.  Verify **Timeline** shows a marker at 2 seconds (cyan diamond).
  6.  Change the input in Props Editor -> Marker moves.
  7.  Click marker -> Playhead jumps to time.
- **Success Criteria**:
  - Time props are visually distinct on the timeline.
  - Editing works bi-directionally (Input -> State -> Marker).
- **Edge Cases**:
  - Prop value `undefined` (should not render).
  - FPS change (Timecode should update).
  - Invalid manual input in TimecodeInput (should revert or show error).
