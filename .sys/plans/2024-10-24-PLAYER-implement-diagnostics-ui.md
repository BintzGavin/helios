#### 1. Context & Goal
- **Objective**: Implement a visible Diagnostics UI (Debug Overlay) in `<helios-player>` to expose the existing `diagnose()` capability to users and developers.
- **Trigger**: "Diagnostics UX Gap" - The backend `diagnose()` method exists but is inaccessible to users without writing custom code.
- **Impact**: Enables easier debugging of environment issues (WebCodecs support, browser compatibility) directly within the player, fulfilling the "Diagnostics for AI Environments" vision.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add UI, styles, and logic)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for `diagnose` signature)

#### 3. Implementation Spec
- **Architecture**:
  - Add a new "Debug Overlay" to the Shadow DOM within `packages/player/src/index.ts`.
  - Bind `Shift+D` keyboard shortcut to toggle this overlay.
  - Expose `diagnose()` as a public method on `HeliosPlayer` class.
- **Public API Changes**:
  - `HeliosPlayer.diagnose(): Promise<DiagnosticReport>`
- **Pseudo-Code**:
  ```typescript
  // In HeliosPlayer class

  // 1. Add new UI elements to the template
  /*
  <div class="debug-overlay hidden" part="debug-overlay">
      <div class="debug-header">
          <span>Diagnostics</span>
          <button class="close-debug-btn">×</button>
      </div>
      <pre class="debug-content"></pre>
      <div class="debug-actions">
           <button class="copy-debug-btn">Copy to Clipboard</button>
      </div>
  </div>
  */

  // 2. Add styles for the overlay (z-index higher than everything else, scrollable content)

  // 3. Implement public method
  public async diagnose(): Promise<DiagnosticReport> {
    if (!this.controller) throw new Error("Not connected");
    return this.controller.diagnose();
  }

  // 4. Implement toggle logic
  private async toggleDiagnostics() {
    if (this.debugOverlay.classList.contains('hidden')) {
        this.debugOverlay.classList.remove('hidden');
        this.debugContent.textContent = "Running diagnostics...";
        try {
            const report = await this.diagnose();
            this.debugContent.textContent = JSON.stringify(report, null, 2);
        } catch (e) {
            this.debugContent.textContent = "Error: " + (e instanceof Error ? e.message : String(e));
        }
    } else {
        this.debugOverlay.classList.add('hidden');
    }
  }

  // 5. Bind keys
  // In handleKeydown:
  if (e.key === "D" && e.shiftKey) {
     this.toggleDiagnostics();
  }
  ```
- **Dependencies**:
  - Depends on `HeliosController.diagnose()` which is already implemented and verified in `packages/core` and `packages/player`.

#### 4. Test Plan
- **Verification**:
  1. Run `npm run build -w packages/player` to ensure no compilation errors.
  2. Serve a demo page using `packages/player`.
  3. Press `Shift+D` to verify the overlay opens.
  4. Verify the JSON content is displayed (e.g. `videoDecoders` support).
  5. Verify the Close button works.
  6. Verify `document.querySelector('helios-player').diagnose()` works in the console.
- **Success Criteria**:
  - `Shift+D` toggles the overlay.
  - Overlay displays valid JSON output from `diagnose()`.
  - Public API `diagnose()` is accessible.
- **Edge Cases**:
  - Toggle while not connected (should show error or handle gracefully).
  - Diagnostics timeout (should show error).
