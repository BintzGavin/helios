# Plan: Implement Diagnostics Overlay in Player UI

## 1. Context & Goal
- **Objective**: Expose the environment diagnostics report (WebCodecs, WebGL, etc.) directly in the Player UI to facilitate debugging for users and agents.
- **Trigger**: Journal entry identifying the gap between the `Helios.diagnose()` API and its accessibility in the UI, and Backlog item "4. Diagnostics and GPU Detection".
- **Impact**: Enables instant environment validation without writing custom scripts, improving the "Agent Experience" and troubleshooting process.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Update template to include Debug button and Overlay.
  - Update styles for new elements.
  - Update `HeliosPlayer` class to handle `debug` attribute and logic.
- **Read-Only**: `packages/core/src/Helios.ts` (Reference for `DiagnosticReport` structure)

## 3. Implementation Spec
- **Architecture**:
  - Add `debug` boolean attribute to `<helios-player>`.
  - **UI**:
    - Add a "Debug" button (🐞) to the `.controls` container in the template.
    - Add a `.diagnostics-overlay` container in the shadow DOM root.
  - **Logic**:
    - `debug` attribute controls visibility of the button via CSS (default: hidden).
    - Click handler calls `this.controller.diagnose()`.
    - Overlay displays the JSON report in a `<pre>` tag.
    - Overlay includes a Close button to hide it.
- **Pseudo-Code**:
  ```typescript
  // In template
  <button class="debug-btn" hidden>🐞</button>
  <div class="diagnostics-overlay hidden">...</div>

  // In class
  get debug() { return this.hasAttribute('debug'); }
  set debug(val) { ... }

  handleDebugClick() {
    this.overlay.classList.remove('hidden');
    this.overlayContent.textContent = "Loading...";
    const report = await this.controller.diagnose();
    this.overlayContent.textContent = JSON.stringify(report, null, 2);
  }
  ```
- **Public API Changes**:
  - New Attribute: `debug` (boolean)
  - New Property: `debug` (boolean)

## 4. Test Plan
- **Verification**:
  - `npm run build -w packages/player`
- **Success Criteria**:
  - `<helios-player debug>` shows the bug icon.
  - Clicking icon shows overlay with JSON report.
- **Edge Cases**:
  - Controller not connected (should show error in overlay).
  - `diagnose()` fails or times out.
