# 2026-01-30-PLAYER-harden-communication.md

#### 1. Context & Goal
- **Objective**: Harden the `<helios-player>` communication bridge to support multiple instances on the same page and prevent duplicate custom element registration.
- **Trigger**: Code analysis revealed that `window.addEventListener('message')` handlers in `HeliosPlayer` and `BridgeController` do not verify `event.source`, which causes cross-talk between multiple players. Additionally, `customElements.define` throws if the script is loaded twice.
- **Impact**: Enables robust usage of multiple players on a single page (e.g. documentation sites, dashboards) and prevents script failures in complex bundle environments.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Add `customElements.get` check and `event.source` verification.
  - `packages/player/src/controllers.ts`: Add `event.source` verification in `BridgeController`.
- **Read-Only**: `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**:
  - In `HeliosPlayer.handleWindowMessage`: Verify `event.source === this.iframe.contentWindow`.
  - In `BridgeController.handleMessage`: Verify `event.source === this.iframeWindow`.
  - In `BridgeController`'s temporary message listeners (for `captureFrame`, `getAudioTracks`, `getSchema`): Verify `event.source === this.iframeWindow`.
  - Wrap `customElements.define` in a check for `customElements.get`.
- **Pseudo-Code**:
  ```typescript
  // index.ts
  private handleWindowMessage = (event: MessageEvent) => {
    if (event.source !== this.iframe.contentWindow) return;
    // ... existing logic
  }

  if (!customElements.get("helios-player")) {
    customElements.define("helios-player", HeliosPlayer);
  }

  // controllers.ts -> BridgeController
  private handleMessage = (event: MessageEvent) => {
    if (event.source !== this.iframeWindow) return;
    // ... existing logic
  }

  // Update temporary listeners similarly
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run existing tests: `npm test -w packages/player` (Ensure no regression).
- **Success Criteria**:
  - Tests pass.
  - Code correctly checks `event.source`.
