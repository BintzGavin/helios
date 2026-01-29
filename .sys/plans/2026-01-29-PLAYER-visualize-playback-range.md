# Plan: Visualize Playback Range in Player UI

## 1. Context & Goal
- **Objective**: Visualize the active playback range (start/end frames) on the timeline scrubber track.
- **Trigger**: `Helios` core supports looping/stopping within a specific frame range (`playbackRange`), but the Player UI currently shows the full timeline without indicating this constraint.
- **Impact**: Improves the "In-Browser Preview" experience by giving users visual feedback on the active loop region, especially useful for Studio workflows.

## 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts` (Update CSS variables, `updateUI` logic)
  - `packages/player/src/index.test.ts` (Add verification test)
- **Read-Only**: `packages/player/src/controllers.ts`, `packages/core/src/index.ts`

## 3. Implementation Spec
- **Architecture**: Use `linear-gradient` on the `input[type="range"]` background to create visual segments (unselected | selected | unselected).
- **Pseudo-Code**:
  ```typescript
  // In updateUI(state):
  if (state.playbackRange) {
      const totalFrames = state.duration * state.fps;
      const [start, end] = state.playbackRange;

      const startPct = (start / totalFrames) * 100;
      const endPct = (end / totalFrames) * 100;

      // Construct linear-gradient string using CSS variables
      // 0% -> startPct%: Unselected
      // startPct% -> endPct%: Selected
      // endPct% -> 100%: Unselected
      this.scrubber.style.background = `linear-gradient(...)`;
  } else {
      // Reset to default track color
      this.scrubber.style.background = ''; // Or var(--helios-range-track-color)
  }
  ```
- **Public API Changes**:
  - New CSS Variable: `--helios-range-selected-color` (Defaults to `rgba(255, 255, 255, 0.2)` or similar contrast over track).
  - New CSS Variable: `--helios-range-unselected-color` (Defaults to `--helios-range-track-color`).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test` in `packages/player`.
- **Success Criteria**:
  - Scrubber background style updates when `playbackRange` changes in state.
  - Default background is preserved when no range is set.
- **Edge Cases**:
  - `playbackRange` is null/undefined.
  - `playbackRange` spans full duration (0 to total).
  - `playbackRange` is very small (start ≈ end).
  - CSS variables fallback correctly.
