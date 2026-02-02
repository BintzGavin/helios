# Context & Goal
- **Objective**: Implement a multi-lane, stacked visualization for audio tracks in the Studio Timeline to improve legibility of complex compositions.
- **Trigger**: Vision gap. The current Timeline renders all audio tracks on top of each other in a single fixed row (`top: 75%`), making it impossible to distinguish overlapping tracks.
- **Impact**: Unlocks accurate audio mixing and previewing capabilities within Studio, aligning with the "Visual timeline" goal.

# File Inventory
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Update rendering logic to calculate lane offsets for each track)
- **Modify**: `packages/studio/src/components/Timeline.css` (Enable vertical scrolling, dynamic height, and sticky ruler)
- **Modify**: `packages/studio/src/App.tsx` (Update layout container to allow Timeline to expand vertically)
- **Modify**: `packages/studio/src/components/Timeline.test.tsx` (Update unit tests to verify stacked positioning logic)

# Implementation Spec
- **Architecture**:
  - The Timeline component will transition from a fixed-height container to a flexible, scrollable area.
  - Tracks will be assigned "lanes" (vertical offsets).
  - Lane 0 is reserved for the Composition (Video) track, Markers, and In/Out points.
  - Lanes 1..N are assigned to Audio Tracks in index order.
  - The Ruler will use `position: sticky` to remain visible during vertical scrolling.

- **Pseudo-Code**:
  - In `Timeline.tsx`:
    - Define constants: `RULER_HEIGHT = 20`, `TRACK_GAP = 4`, `COMP_TRACK_HEIGHT = 24`, `AUDIO_TRACK_HEIGHT = 24`.
    - Render `timeline-ruler` inside `timeline-content` with sticky positioning.
    - Render Composition elements (Region, Markers) at `top: RULER_HEIGHT + TRACK_GAP`.
    - Iterate `audioTracks` and render each at `top: RULER_HEIGHT + TRACK_GAP + COMP_TRACK_HEIGHT + TRACK_GAP + index * (AUDIO_TRACK_HEIGHT + TRACK_GAP)`.
    - Remove fixed height from `timeline-container` style if present.

- **Public API Changes**: None.

- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npm run dev` in `packages/studio`.
  - Open an example composition with multiple audio tracks (or inject one).
  - Observe that audio tracks are stacked vertically and do not overlap.
  - Scroll the timeline vertically to ensure the ruler stays pinned.
- **Success Criteria**:
  - Audio tracks have distinct vertical positions.
  - Timeline expands to fill available panel space.
  - Unit tests in `Timeline.test.tsx` pass.
