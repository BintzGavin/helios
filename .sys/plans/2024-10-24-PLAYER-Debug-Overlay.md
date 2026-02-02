# 1. Context & Goal
- **Objective**: Implement a "Debug Overlay" in `<helios-player>` to expose environment diagnostics (WebCodecs, WAAPI support) and real-time player state.
- **Trigger**: Vision gap identified in journal (v0.56.1) - "Diagnostics UX Gap". The API exists but is not exposed to the user.
- **Impact**: Enables users (and AI agents) to verify environment capabilities and debug playback issues (e.g. why export might fail) directly in the UI.

# 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add debug overlay logic and UI)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for debug attribute)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for `diagnose()` return type)

# 3. Implementation Spec
- **Architecture**:
  - Add `debug` boolean attribute to `<helios-player>`.
  - Add a `.debug-overlay` element to the Shadow DOM (hidden by default).
  - When `debug` is enabled:
    - Fetch `DiagnosticReport` via `controller.diagnose()`.
    - Render environment stats (WebCodecs, WAAPI) and static player info (Resolution).
    - Subscribe to `updateUI` to render dynamic stats (Current Frame, FPS).
  - The overlay will be positioned in the top-left corner, semi-transparent.
- **Public API Changes**:
  - New attribute/property: `debug` (boolean).
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    get debug() { return this.hasAttribute('debug'); }
    set debug(val) { toggleAttribute('debug', val); }

    // In template
    // <div class="debug-overlay hidden">
    //   <div class="debug-section">Environment</div>
    //   <pre class="debug-env">Loading...</pre>
    //   <div class="debug-section">State</div>
    //   <pre class="debug-state">-</pre>
    // </div>

    // On connect / attribute change
    if (this.debug) {
      this.debugOverlay.classList.remove('hidden');
      this.refreshDiagnostics();
    }

    async refreshDiagnostics() {
       const report = await this.controller.diagnose();
       this.renderEnv(report);
    }

    updateUI(state) {
       super.updateUI(state);
       if (this.debug) this.renderState(state);
    }
  }
  ```
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `debug` attribute toggles overlay visibility.
  - Overlay contains text matching "WebCodecs" (from diagnostics).
  - Overlay updates when frame changes (mocked).
- **Edge Cases**:
  - `debug` enabled before controller connection (should show "Loading..." or empty).
  - `debug` toggled while playing.
  - `diagnose()` failing or timing out.
