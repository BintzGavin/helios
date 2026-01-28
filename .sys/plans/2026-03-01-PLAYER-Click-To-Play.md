# Context & Goal
- **Objective**: Implement a transparent "Click Layer" over the video area in `<helios-player>` to support standard Click-to-Play/Pause and Double-Click-to-Fullscreen behaviors, while preventing the iframe from stealing focus.
- **Trigger**: Users expect standard video player interactions (clicking the video toggles playback), and the current implementation lacks this. Additionally, interacting with the iframe breaks keyboard shortcuts (Space/F) because focus is lost to the sandboxed iframe.
- **Impact**: Improves User Experience (UX) to match standard video players and fixes Accessibility (a11y) issues regarding keyboard focus retention.

# File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/player/src/index.ts`: Add `.click-layer` to template, styles, and event handling logic.
- **Read-Only**:
  - `packages/player/src/controllers.ts`

# Implementation Spec
- **Architecture**:
  - Introduce a `.click-layer` `<div>` positioned absolutely over the `<iframe>` but below the controls and poster.
  - This layer captures pointer events, keeping focus on the `<helios-player>` host element (or the layer itself, bubbling up) instead of passing it to the iframe's `window`.
  - An `interactive` attribute allows users to disable this layer (via `pointer-events: none`), passing clicks through to the iframe for interactive compositions.

- **Pseudo-Code**:
  - **Template**:
    - Add `<div class="click-layer" part="click-layer"></div>` to the shadow DOM template (likely before `.controls`).
  - **CSS**:
    - `.click-layer`: `position: absolute; inset: 0; z-index: 1;`.
    - Ensure `.controls`, `.poster-container`, and `.status-overlay` have `z-index > 1`.
  - **Class `HeliosPlayer`**:
    - **Properties**: Add `interactive` to `observedAttributes`.
    - **Lifecycle**:
      - `attributeChangedCallback`:
        - If `interactive` is present/true, set `.click-layer` style `pointer-events: none`.
        - Else, set `pointer-events: auto`.
      - `connectedCallback`:
        - Bind `click` event on `.click-layer` to `togglePlayPause()`.
        - Bind `dblclick` event on `.click-layer` to `toggleFullscreen()`.
      - `disconnectedCallback`:
        - Remove event listeners.
  - **Public API Changes**:
    - Add `interactive` attribute/property (boolean).

# Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - **Click-to-Play**: Clicking the video area (when `interactive` is false) toggles playback.
  - **Double-Click**: Double-clicking the video area toggles fullscreen.
  - **Focus Retention**: After clicking the video, pressing `Space` triggers play/pause (focus remains on player).
  - **Interactive Mode**: Adding `interactive` attribute allows clicks to reach the iframe (verified by checking `pointer-events` style or manual interaction).
- **Edge Cases**:
  - Ensure `.click-layer` does not block the "Big Play Button" or "Controls" (z-index check).
  - Ensure Context Menu still works (optional, but standard behavior is usually allowed).
