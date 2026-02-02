#### 1. Context & Goal
- **Objective**: Implement a Diagnostics UI Overlay in `<helios-player>` to expose environment capabilities.
- **Trigger**: The current Player UI lacks visibility into underlying engine capabilities (WebCodecs, WebGL, etc.), making it hard to diagnose export failures. The `Helios.diagnose()` API exists but is inaccessible to users.
- **Impact**: Enables users and agents to verify browser support directly within the player via a keyboard shortcut (`Shift+D`), improving the debugging experience.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add UI overlay, CSS, and controller logic)
- **Modify**: `packages/player/package.json` (Bump version to `0.59.0`)
- **Read-Only**: `packages/core/src/Helios.ts` (For `DiagnosticReport` type structure)

#### 3. Implementation Spec
- **Architecture**:
  - Web Component Shadow DOM update to include a hidden overlay div.
  - Event listener for `Shift+D` to toggle visibility and fetch data.
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/index.ts

  // 1. Import DiagnosticReport
  import { DiagnosticReport } from "@helios-project/core";

  // 2. Add to template innerHTML
  // <div class="diagnostics-overlay hidden" part="diagnostics">...</div>

  // 3. Add to CSS
  // .diagnostics-overlay { position: absolute; inset: 20px; z-index: 20; ... }

  // 4. Update HeliosPlayer class
  class HeliosPlayer extends HTMLElement {
    // Properties
    private diagnosticsOverlay: HTMLElement;
    private diagnosticsContent: HTMLElement;
    private closeDiagnosticsBtn: HTMLElement;

    constructor() {
      // ...
      // Query elements
      this.diagnosticsOverlay = this.shadowRoot!.querySelector(".diagnostics-overlay")!;
      // ...
      // Bind close button click
    }

    private handleKeydown = (e: KeyboardEvent) => {
      // ...
      if (e.key === "D" && e.shiftKey) {
        this.toggleDiagnostics();
      }
    }

    private async toggleDiagnostics() {
      // Toggle hidden class
      if (opening) {
        this.diagnosticsContent.textContent = "Loading...";
        try {
          const report = await this.controller.diagnose();
          this.diagnosticsContent.textContent = JSON.stringify(report, null, 2);
        } catch (e) {
          this.diagnosticsContent.textContent = "Error: " + e.message;
        }
      }
    }
  }
  ```
- **Public API Changes**: None (UI only feature).
- **Dependencies**: Depends on `HeliosController.diagnose()` (already verified as existing).

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player && npm run dev -w packages/studio`
- **Success Criteria**:
  1. Load Studio or Example.
  2. Press `Shift+D`.
  3. Overlay appears with "Loading..." then JSON data.
  4. JSON contains `webCodecs`, `videoCodecs`, etc.
  5. Close button hides overlay.
- **Edge Cases**:
  - Controller not connected (should show error or handle gracefully).
  - Diagnostics timeout (should show error).

<!-- Retry trigger: Mon Feb  2 20:53:06 UTC 2026 -->
