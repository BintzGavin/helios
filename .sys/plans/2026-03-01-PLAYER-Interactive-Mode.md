# Plan: PLAYER-Interactive-Mode

## 1. Context & Goal
- **Objective**: Implement an `interactive` attribute on `<helios-player>` to toggle between Standard Video Mode (click-to-pause) and Interactive Mode (clicks reach composition).
- **Trigger**: Currently, clicking the video area passes events to the iframe. This violates standard "Video Player" expectations where clicking toggles play/pause. Conversely, interactive compositions require direct access.
- **Impact**: Improves UX by defaulting to familiar video controls while allowing interactivity for complex compositions (and future Studio integration).

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add `click-layer`, styles, and logic)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for click behavior and attribute)
- **Modify**: `packages/player/README.md` (Document `interactive` attribute)

## 3. Implementation Spec
- **Architecture**:
  - Inject a `<div class="click-layer">` into Shadow DOM, positioned absolute `inset: 0` with `z-index: 1` (above iframe, below controls).
  - Use CSS to hide/disable this layer when `interactive` attribute is present.
- **Logic**:
  - **Default (interactive=false)**: `.click-layer` is active.
    - `click` -> `togglePlayPause()`
    - `dblclick` -> `toggleFullscreen()`
  - **Interactive (interactive=true)**: `.click-layer` gets `display: none` or `pointer-events: none`.
    - Events pass through to iframe.
- **Public API**:
  - Attribute: `interactive` (boolean, reflected).
  - Property: `interactive` (getter/setter).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `it('should toggle play/pause when clicking the video area (default)')`
  - `it('should toggle fullscreen on double click')`
  - `it('should allow clicks to pass through when interactive attribute is present')`
