# Context & Goal
- **Objective**: Implement responsive layout logic for `<helios-player>` using `ResizeObserver` to adapt UI controls for varying container widths.
- **Trigger**: The current player controls are fixed-width and may overflow or break on small screens (mobile) or in narrow containers (sidebars).
- **Impact**: Ensures the player remains usable and visually unbroken in all contexts ("Drop-in Web Component"), enhancing the user experience on mobile devices and tight layouts.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Add ResizeObserver logic and responsive CSS classes)
- **Read-Only**: `packages/player/src/controllers.ts`, `packages/player/src/features/exporter.ts`

# Implementation Spec
- **Architecture**:
  - Use `ResizeObserver` to monitor the host element's width.
  - Apply CSS classes (`.layout-compact`, `.layout-tiny`) to the `.controls` container based on breakpoints.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer extends HTMLElement {
    private resizeObserver: ResizeObserver;

    constructor() {
      super();
      // Initialize ResizeObserver
      this.resizeObserver = new ResizeObserver((entries) => {
        // Toggle classes based on width
        // < 500px: compact (hide volume slider)
        // < 350px: tiny (hide speed, simplify time)
      });
    }

    connectedCallback() {
      // ... existing code ...
      this.resizeObserver.observe(this);
    }

    disconnectedCallback() {
      // ... existing code ...
      this.resizeObserver.disconnect();
    }
  }
  ```
- **CSS Changes**:
  - Add styles for `.layout-compact` (hide `.volume-slider`).
  - Add styles for `.layout-tiny` (hide `.speed-selector`, hide `.export-btn` text or button entirely if needed, condense margins).
- **Public API Changes**: None (Internal UI behavior change only).
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Build the package: `npm run build -w packages/player`.
  2. Create a temporary HTML test file that renders `<helios-player>` at various widths (e.g., 300px, 450px, 800px).
  3. Verify visually that controls adapt:
     - At 300px: Speed selector hidden, Volume slider hidden.
     - At 450px: Volume slider hidden, Speed selector visible.
     - At 800px: All controls visible.
  4. Run `npx vitest` to ensure all existing tests pass.
- **Success Criteria**: The player controls do not overflow or overlap at widths down to 300px, and all tests pass.
- **Edge Cases**:
  - Width = 0 (should handle gracefully).
  - Rapid resizing (ResizeObserver handles this efficiently).
  - High DPI screens (CSS pixels used, so should be fine).
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
