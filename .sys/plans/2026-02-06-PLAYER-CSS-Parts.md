# 📋 Plan: CSS Parts for UI Customization

## 1. Context & Goal
- **Objective**: Expose critical internal UI elements of `<helios-player>` via CSS Shadow Parts (`part` attribute) to enable full styling customization.
- **Trigger**: The current implementation exposes some elements (like buttons) but leaves container elements (like the main control bar) and overlay elements (like the big play button) unstyleable from the outside, limiting integration with custom design systems.
- **Impact**: Developers can fully theme the player (e.g., custom gradients for controls, hiding the big play button, styling status text) using standard CSS `::part()` selectors without forking the component.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add `part` attributes to HTML template)
- **Read-Only**: `packages/player/src/features/*.ts`

## 3. Implementation Spec
- **Architecture**: Standard Web Component Shadow DOM API (`part` attribute).
- **Changes**:
  - Add `part="controls"` to `.controls` container.
  - Add `part="volume-control"` to `.volume-control` container.
  - Add `part="scrubber-wrapper"` to `.scrubber-wrapper` container.
  - Add `part="poster-image"` to `.poster-image` element.
  - Add `part="big-play-button"` to `.big-play-btn` element.
  - Add `part="status-text"` to `.status-text` element.
  - Add `part="retry-button"` to `.retry-btn` element.
  - Add `part="shortcuts-header"` to `.debug-header` inside shortcuts overlay.
  - Add `part="shortcuts-grid"` to `.shortcuts-grid`.
  - Add `part="debug-header"` to `.debug-header` inside debug overlay.
  - Add `part="debug-content"` to `.debug-content`.

## 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure valid TypeScript.
  - Run `cd packages/player && npx vitest run` to ensure no regressions.
  - Read `packages/player/src/index.ts` to confirm the presence of new `part` attributes.
- **Success Criteria**: All specified elements have the correct `part` attribute.
- **Edge Cases**: None (purely declarative HTML change).
