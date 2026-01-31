# 2026-05-29-PLAYER-harden-bridge-security.md

#### 1. Context & Goal
- **Objective**: Secure the `<helios-player>` postMessage bridge by verifying message sources and preventing multi-instance cross-talk.
- **Trigger**: Security vulnerability/bug where players on the same page receive and process each other's messages because `event.source` is ignored.
- **Impact**: Prevents potential XSS via malicious frames and enables robust multi-player usage on a single page without cross-talk.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Update `handleWindowMessage` and `customElements.define`.
  - `packages/player/src/controllers.ts`: Update `BridgeController` constructor and `handleMessage`.
  - `packages/player/src/controllers.test.ts`: Update `triggerMessage` helper to include `source` mock.
- **Read-Only**: `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosPlayer`:
    - `handleWindowMessage`: Add `if (event.source !== this.iframe.contentWindow) return;` check.
    - `customElements.define`: Wrap in `if (!customElements.get("helios-player"))` to prevent registry errors.
  - `BridgeController`:
    - Constructor: Accept `iframeWindow: Window` (already exists) but ensure it's used for verification.
    - `handleMessage`: Add `if (event.source !== this.iframeWindow) return;`.
    - `captureFrame`: Add `source` check to temporary listener.
    - `getAudioTracks`: Add `source` check to temporary listener.
    - `getSchema`: Add `source` check to temporary listener.

- **Pseudo-Code**:
  ```typescript
  // index.ts
  handleWindowMessage = (event: MessageEvent) => {
    // Security check: Only accept messages from our own iframe
    if (event.source !== this.iframe.contentWindow) return;
    // ...
  }

  if (!customElements.get("helios-player")) {
    customElements.define("helios-player", HeliosPlayer);
  }

  // controllers.ts
  class BridgeController {
    // ...
    handleMessage = (event: MessageEvent) => {
       if (event.source !== this.iframeWindow) return;
       // ...
    }

    // In captureFrame, getAudioTracks, getSchema:
    // Ensure temporary message listeners also verify event.source === this.iframeWindow
  }
  ```

#### 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/player` to ensure no regressions.
  - The updated `controllers.test.ts` will verify that `BridgeController` correctly processes messages when `source` matches and ignores them when it doesn't (implicit via the fact that `triggerMessage` sets the correct source).
- **Success Criteria**:
  - All tests pass.
  - `BridgeController` tests specifically pass with the updated `triggerMessage` helper.
