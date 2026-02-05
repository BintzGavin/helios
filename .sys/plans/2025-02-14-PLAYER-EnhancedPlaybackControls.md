# 2025-02-14-PLAYER-EnhancedPlaybackControls.md

#### 1. Context & Goal
- **Objective**: Improve playback speed controls by adding granular options (0.25x - 2x in 0.25 increments) and implementing keyboard shortcuts (`<` and `>`).
- **Trigger**: "Standard Media API" parity gap and UX polish; current controls are too coarse compared to standard players (e.g., YouTube).
- **Impact**: Users get finer control over playback review; keyboard shortcuts align with industry standards.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update HTML template and keyboard handler)
- **Modify**: `packages/player/src/interaction.test.ts` (Add tests for new shortcuts)

#### 3. Implementation Spec
- **Architecture**:
  - Update `speed-selector` `<select>` in the shadow DOM template to include `0.75`, `1.25`, `1.5`, `1.75`.
  - Implement `stepPlaybackRate(direction: number)` helper in `HeliosPlayer`.
  - Update `handleKeydown` to map `<` (decrease) and `>` (increase) to `stepPlaybackRate`.
- **Logic**:
  - `stepPlaybackRate` will define a sorted list of supported rates: `[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]`.
  - It will find the closest index to the current `playbackRate` (using epsilon for float comparison).
  - It will increment/decrement the index (clamped to bounds) and set the new rate.
  - The UI (selector) will update automatically via the existing `ratechange` / `updateUI` loop.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `interaction.test.ts` passes.
  - Pressing `>` increases speed (e.g., 1 -> 1.25).
  - Pressing `<` decreases speed (e.g., 1 -> 0.75).
  - Speed selector reflects the new value.
  - Edge case: Pressing `>` at max speed stays at max.
  - Edge case: Pressing `<` at min speed stays at min.
