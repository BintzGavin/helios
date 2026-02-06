# 📋 PLAYER: Implement SVG Icons

## 1. Context & Goal
- **Objective**: Replace text-based control icons (Unicode characters) with inline SVG icons to ensure visual consistency and professional polish across all platforms.
- **Trigger**: The current player uses characters like "▶", "🔊", "⚙" which vary by font/OS and do not meet the "Feature Complete" visual standard.
- **Impact**: Improves the "Agent Experience" and end-user perception of the Helios Player, aligning it with modern video player standards.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Define SVGs, update template, update render logic)
- **Modify**: `packages/player/src/index.test.ts` (Update assertions that rely on button text content)

## 3. Implementation Spec
- **Architecture**:
  - Define a `const ICONS` dictionary with SVG strings for all controls (Play, Pause, Replay, Volume High, Volume Low, Volume Muted, Settings, Fullscreen, Exit Fullscreen, PiP, CC, Audio Tracks, Export).
  - Update `HeliosPlayer` template to use these SVGs initially.
  - Update `updateUI` and event handlers to swap `innerHTML` with appropriate SVG icons based on state.
  - Update the `<style>` block within the `HeliosPlayer` template in `packages/player/src/index.ts` to include rules for the new SVG icons (e.g., set `fill: currentColor`, `width: 24px`, `height: 24px`, and `vertical-align: middle` to ensure proper scaling and alignment).

- **Pseudo-Code**:
  ```typescript
  const ICONS = {
    play: `<svg viewBox="0 0 24 24" ...>...</svg>`,
    pause: `<svg viewBox="0 0 24 24" ...>...</svg>`,
    // ...
  };

  // In template
  <button class="play-pause-btn" aria-label="Play">${ICONS.play}</button>

  // In updateUI
  this.playPauseBtn.innerHTML = state.isPlaying ? ICONS.pause : ICONS.play;
  ```

- **Public API Changes**: None.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm run build` to ensure no syntax errors.
  - Run `npm test` to ensure logic is sound.
  - Verify that tests in `index.test.ts` pass with updated expectations (e.g. `expect(btn.querySelector('svg')).toBeTruthy()` instead of checking `textContent`).
- **Success Criteria**:
  - All buttons display SVG icons.
  - Icons respond to state changes (Play -> Pause, Mute -> Unmute).
  - Icons inherit color from CSS variables.
- **Edge Cases**:
  - High contrast mode (SVGs should use `currentColor`).
  - Different font sizes (SVGs should scale).
