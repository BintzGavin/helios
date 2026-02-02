#### 1. Context & Goal
- **Objective**: Implement a visual Diagnostics Overlay in `<helios-player>` to expose environment capabilities and compatibility checks.
- **Trigger**: Vision gap "Diagnostics for AI Environments" and Journal entry [v0.56.1] requesting UI exposure for the existing Diagnostics API.
- **Impact**: Unlocks the ability for users and agents to troubleshoot playback and export issues (e.g., WebCodecs support) directly in the player without external scripts.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts`: Add `debug` attribute, UI elements (button, overlay), and logic for fetching/displaying diagnostics.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: To reference the `diagnose()` interface.

#### 3. Implementation Spec
- **Architecture**:
  - Extend `<helios-player>` to observe a `debug` attribute.
  - Modify Shadow DOM template to include a `.diagnostics-overlay` (modal) and a `.diagnostics-btn` in the controls (conditionally visible).
  - Use `controller.diagnose()` to fetch the `DiagnosticReport` from the core/iframe.
- **Pseudo-Code**:
  - `observedAttributes`: Add "debug".
  - `attributeChangedCallback`:
    - If "debug": toggle `.diagnostics-btn` visibility.
  - `showDiagnostics()`:
    - Show overlay with "Running diagnostics..." message.
    - `try`:
      - `report = await controller.diagnose()`
      - Render report as formatted JSON in `<pre>` tag.
    - `catch`:
      - Render error message.
  - `hideDiagnostics()`:
    - Hide overlay.
  - Event Listeners:
    - `.diagnostics-btn` click -> `showDiagnostics()`
    - Overlay "Close" button click -> `hideDiagnostics()`
- **Public API Changes**:
  - New Attribute: `debug` (boolean) - enables the UI button.
  - New Method: `showDiagnostics(): Promise<void>` - opens the overlay programmatically.
  - New Property: `debug` (boolean getter/setter).
- **Dependencies**:
  - `HeliosController.diagnose()` (Implemented in `v0.56.0`).

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure type safety.
  - Create a test case (or manual verification) where `<helios-player debug>` is instantiated.
- **Success Criteria**:
  - The "Bug" icon appears in the control bar when `debug` is present.
  - Clicking the icon opens a modal overlay.
  - The overlay displays a JSON structure containing `webCodecs`, `userAgent`, etc.
  - The "Close" button dismisses the overlay.
- **Edge Cases**:
  - `diagnose()` timeout (should show error).
  - Bridge mode (ensure message passing works for diagnostics).
