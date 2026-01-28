# Context & Goal
- **Objective**: Implement the `interactive` attribute and a click-to-toggle overlay for `<helios-player>`.
- **Trigger**: Vision gap where standard video player behavior (click to pause) is missing, but direct interaction with the composition is sometimes needed.
- **Impact**: Improves UX by providing familiar video controls (click-to-pause, double-click-to-fullscreen) while retaining the ability to support interactive compositions via an opt-out mechanism.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Add overlay HTML/CSS, attribute logic, event listeners).
- **Modify**: `packages/player/src/index.test.ts` (Add unit tests for `interactive` attribute and overlay behavior).
- **Read-Only**: `packages/player/src/controllers.ts` (No changes needed to controller interface).

# Implementation Spec
- **Architecture**:
    -   Introduce a transparent `div.click-layer` within the Shadow DOM, absolutely positioned to cover the `iframe` but sit below the `.controls` and `.poster-container`.
    -   Use CSS `pointer-events` to toggle the active state of this layer based on the `interactive` attribute.
-   **Pseudo-Code**:
    -   **Template Changes**:
        -   Add `<div class="click-layer" part="click-layer"></div>` to the shadow root HTML.
        -   CSS:
            ```css
            .click-layer {
                position: absolute;
                inset: 0;
                z-index: 1; /* Above iframe (0), below controls/poster/overlay */
                /* Optional: cursor: pointer; if we want to indicate clickable */
            }
            :host([interactive]) .click-layer {
                pointer-events: none;
                display: none; /* Optimization */
            }
            ```
    -   **Logic Changes**:
        -   Add `interactive` to `observedAttributes`.
        -   Implement `get/set interactive` property reflecting the attribute.
        -   In `connectedCallback`:
            -   Add `click` listener to `.click-layer`: calls `togglePlayPause()`.
            -   Add `dblclick` listener to `.click-layer`: calls `toggleFullscreen()`.
            -   (Ensure listeners are removed in `disconnectedCallback`).
-   **Public API Changes**:
    -   New Attribute: `interactive` (boolean).
    -   New Property: `interactive` (boolean).
-   **Dependencies**: None.

# Test Plan
-   **Verification**: Run `npm test -w packages/player`.
-   **Success Criteria**:
    -   Verify `interactive` attribute creates/removes the attribute on the host.
    -   Verify clicking the overlay calls `play()` or `pause()` on the controller.
    -   Verify double-clicking the overlay calls `requestFullscreen()`.
    -   Verify that when `interactive` is present, the overlay is effectively disabled (check `pointer-events` style or simulation).
-   **Edge Cases**:
    -   Ensure clicking controls (Play/Pause buttons) does not trigger the overlay click handler (propagation logic, though separate elements usually handles this naturally).
    -   Ensure overlay does not block the "Big Play Button" or "Status Overlay" (z-index management).
