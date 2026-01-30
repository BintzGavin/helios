#### 1. Context & Goal
- **Objective**: Add "Previous Frame" and "Next Frame" buttons to the `<helios-player>` control bar to allow precise navigation via UI.
- **Trigger**: Vision Gap - The `README.md` lists "frame-by-frame" as a planned playback control feature, but currently it is only available via keyboard shortcuts, lacking UI affordances.
- **Impact**: Improves the user experience for reviewing animations precisely, aligning the player UI with the "Studio" vision and providing accessibility for mouse/touch users.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts`: Update Shadow DOM template with new buttons, add event listeners, and update styles.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: Reference for the `seek` method.

#### 3. Implementation Spec
- **Architecture**:
  - Extend the existing Web Component Shadow DOM structure.
  - Add two new `<button>` elements to the `.controls` container.
  - Use standard `click` event listeners wired to the internal `seekRelative` method.
  - Leverage existing CSS variables for styling to match the current theme.
- **Pseudo-Code**:
  ```typescript
  // In `packages/player/src/index.ts` template:
  // Add <button class="prev-frame-btn"> and <button class="next-frame-btn">
  // adjacent to or surrounding the play-pause-btn.
  // Use icons (e.g., SVG or text characters like |◀ and ▶|) consistent with existing buttons.

  // In `HeliosPlayer` class:
  // 1. Query the new buttons in constructor: `this.prevFrameBtn`, `this.nextFrameBtn`
  // 2. Add click listeners:
  //    prevFrameBtn.onClick => this.seekRelative(event.shiftKey ? -10 : -1)
  //    nextFrameBtn.onClick => this.seekRelative(event.shiftKey ? 10 : 1)
  // 3. Update `setControlsDisabled(disabled)` to toggle `disabled` state on these new buttons.
  // 4. Update `lockPlaybackControls(locked)` to toggle `disabled` state on these new buttons.
  ```
- **Public API Changes**: None (UI only change).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player` and visual inspection via `npm run build:examples`.
- **Success Criteria**:
  - Unit tests in `packages/player/src/interaction.test.ts` (or similar) verify that clicking the buttons triggers `controller.seek()` with appropriate deltas (-1/+1).
  - Tests verify that `Shift+Click` triggers larger deltas (-10/+10).
  - UI check confirms buttons are visible, styled correctly, and hidden/disabled appropriately (e.g., when `controls` attribute is missing).
- **Edge Cases**:
  - Stepping backward from frame 0 (should clamp to 0).
  - Stepping forward from last frame (should clamp to end).
  - Buttons should be responsive (hide/rearrange) on very small screens if necessary, or check layout constraints.
