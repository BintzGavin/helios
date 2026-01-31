# 2026-01-31-PLAYER-Scrubber-Tooltip

## 1. Context & Goal
- **Objective**: Add a hover tooltip to the timeline scrubber showing the precise timestamp, and implement the `M` key shortcut for muting.
- **Trigger**: Vision gap in "UI controls" - standard video player features are missing.
- **Impact**: Improves UX by allowing precise seeking and adds standard accessibility shortcut.

## 2. File Inventory
- **Create**: None.
- **Modify**: `packages/player/src/index.ts` (Add HTML, CSS, and Event Logic).
- **Read-Only**: `packages/player/src/controllers.ts`.

## 3. Implementation Spec
- **Architecture**:
  - Web Component Shadow DOM enhancement.
  - Add `.scrubber-tooltip` div inside `.scrubber-wrapper`.
  - Use `mousemove` on wrapper to calculate time: `(offsetX / width) * duration`.
  - Update tooltip text and position (centered on cursor).
  - Use `toggleMute()` for `M` key.
- **Pseudo-Code**:
  - HTML: Add `<div class="scrubber-tooltip hidden"></div>`
  - CSS: `.scrubber-tooltip { position: absolute; ... }`
  - TS:
    - `handleScrubberHover(e)`:
      - calc time
      - set textContent = time.toFixed(2)
      - set style.left = e.offsetX
      - remove hidden class
    - `handleScrubberLeave()`: add hidden class
    - `handleKeydown(e)`: case 'm': toggleMute()
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run build -w packages/player` && `npm test -w packages/player`
- **Success Criteria**:
  - Build passes.
  - Tooltip appears on hover.
  - `M` key toggles mute.
- **Edge Cases**:
  - Duration is 0 or NaN (don't show tooltip).
  - Hover at edges (0% or 100%).
