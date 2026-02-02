# 📋 PLAYER: Implement Diagnostics UI

## 1. Context & Goal
- **Objective**: Implement a Diagnostics UI in `<helios-player>` to visualize the environment report from `helios.diagnose()`.
- **Trigger**: The feature is missing from the codebase despite being documented in memory/plans as part of v0.57.1+. This UI is critical for debugging environment capabilities (e.g., WebCodecs, GPU acceleration).
- **Impact**: Enables users and agents to verify environment compatibility directly within the player interface.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add UI, attribute handling, and logic)
- **Modify**: `packages/player/src/index.test.ts` (Add unit tests)

## 3. Implementation Spec
- **Architecture**:
  - Update `<helios-player>` (Web Component) to observe the `debug` attribute.
  - Add a hidden "Diagnostics Panel" to the Shadow DOM.
  - Implement `showDiagnostics()` and `hideDiagnostics()` public methods.
  - Bridge logic: Use `this.controller.diagnose()` to fetch the `DiagnosticReport`.
  - UI: Render the report as a clean key-value list/table overlaying the player.

- **Pseudo-Code**:
  ```typescript
  // packages/player/src/index.ts

  // 1. Add observed attribute
  static get observedAttributes() {
    return [..., "debug"];
  }

  // 2. Add properties
  private diagnosticsOverlay: HTMLDivElement;
  private diagnosticsContent: HTMLDivElement;

  // 3. Update Template
  // Add:
  // <div class="diagnostics-overlay hidden" part="diagnostics">
  //   <h3>Environment Diagnostics</h3>
  //   <div class="diagnostics-content">Loading...</div>
  //   <button class="diagnostics-close">Close</button>
  // </div>
  // Add CSS for .diagnostics-overlay (absolute, z-index high, dark bg, white text)

  // 4. Implement methods
  public async showDiagnostics() {
    this.diagnosticsOverlay.classList.remove("hidden");
    if (this.controller) {
      try {
        const report = await this.controller.diagnose();
        this.renderDiagnostics(report);
      } catch (e) {
        this.diagnosticsContent.textContent = "Error: " + e.message;
      }
    } else {
      this.diagnosticsContent.textContent = "Not connected.";
    }
  }

  public hideDiagnostics() {
    this.diagnosticsOverlay.classList.add("hidden");
  }

  private renderDiagnostics(report: DiagnosticReport) {
    // Format JSON report into readable HTML
    // e.g.
    // WebCodecs: ✅
    // OffscreenCanvas: ✅
    // User Agent: ...
  }

  // 5. Handle attribute change
  attributeChangedCallback(name, oldVal, newVal) {
    // ...
    if (name === "debug") {
      if (this.hasAttribute("debug")) {
        this.showDiagnostics();
      } else {
        this.hideDiagnostics();
      }
    }
  }
  ```

- **Public API Changes**:
  - `showDiagnostics(): Promise<void>`
  - `hideDiagnostics(): void`
  - Attribute: `debug` (boolean)

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
  - `index.test.ts` passes.
  - Test confirms `debug` attribute triggers `showDiagnostics`.
  - Test confirms `diagnose()` is called on the controller.
  - Test confirms overlay visibility toggles.
- **Edge Cases**:
  - Controller disconnected when `showDiagnostics` called.
  - `diagnose()` rejects/fails.
