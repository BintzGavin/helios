# Granular Playback Speed

#### 1. Context & Goal
- **Objective**: Expand the playback speed options in `<helios-player>` to include standard intermediate steps (0.75x, 1.25x, 1.5x, 1.75x).
- **Trigger**: Journal learning (v0.66.4) noting that previous options (0.25, 0.5, 1, 2) were too coarse for effective review.
- **Impact**: Improves the review workflow for users by providing industry-standard playback controls (matching YouTube/VLC), allowing for more precise animation checking.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/player/src/index.ts`: Update `renderSettingsMenu` method to generate expanded speed options.
- **Read-Only**:
  - `packages/player/test/api_parity.test.ts`: Reference for existing tests.

#### 3. Implementation Spec
- **Architecture**: No architectural changes. Purely a UI enhancement within the Shadow DOM generation logic.
- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/index.ts -> renderSettingsMenu()

  // Define standard playback rates
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const speedSelect = document.createElement("select");
  speedSelect.className = "settings-select";

  // Generate options dynamically
  speedSelect.innerHTML = speeds.map(rate =>
      `<option value="${rate}">${rate}x</option>`
  ).join("");

  // Set current value
  speedSelect.value = String(state.playbackRate || 1);
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
  - Build passes.
  - Unit tests pass (ensuring no regression in `renderSettingsMenu` execution).
- **Edge Cases**:
  - Ensure floating point matching works for `select.value` (e.g., `0.75` vs `"0.75"`).
  - Verify `playbackRate` persistence logic still applies correctly with new values.
