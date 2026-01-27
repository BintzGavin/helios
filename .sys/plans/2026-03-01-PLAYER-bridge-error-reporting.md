# 2026-03-01-PLAYER-bridge-error-reporting.md

#### 1. Context & Goal
- **Objective**: Implement robust error reporting across the iframe bridge to surface runtime errors from the composition to the Player UI.
- **Trigger**: Vision gap ("Clear error messages") and lack of visibility into iframe crashes (especially "Script error" in cross-origin scenarios).
- **Impact**: Improves Agent/Developer Experience by displaying actionable error messages in the player overlay instead of failing silently.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Add `onError` to interface and implementations)
- **Modify**: `packages/player/src/bridge.ts` (Capture global errors and send `HELIOS_ERROR`)
- **Modify**: `packages/player/src/index.ts` (Subscribe to errors and display in UI)
- **Modify**: `packages/player/src/controllers.test.ts` (Add unit tests for error handling)

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosController` interface gains `onError(callback): unsubscribe`.
  - `bridge.ts` (in iframe) adds global `error` and `unhandledrejection` listeners and posts `HELIOS_ERROR` messages.
  - `BridgeController` (in player) listens for `HELIOS_ERROR` and notifies subscribers.
  - `DirectController` (in player) listens to `iframe.contentWindow` error events directly.
  - `HeliosPlayer` displays errors in the existing `status-overlay` and dispatches a standard `error` DOM event.

- **Pseudo-Code**:
  ```typescript
  // bridge.ts
  export function connectToParent(helios: Helios) {
    // ... existing listeners ...
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'HELIOS_ERROR',
        error: { message: e.message, filename: e.filename, lineno: e.lineno }
      }, '*');
    });
    window.addEventListener('unhandledrejection', (e) => {
      window.parent.postMessage({
        type: 'HELIOS_ERROR',
        error: { message: e.reason?.message || String(e.reason) }
      }, '*');
    });
  }

  // controllers.ts
  interface HeliosController {
    // ...
    onError(cb: (err: any) => void): () => void;
  }

  class BridgeController {
    // ...
    onError(cb: (err: any) => void) {
      // Listen for HELIOS_ERROR and call cb
      // Return unsubscribe
    }
  }

  // index.ts
  private setController(controller: HeliosController) {
    // ...
    controller.onError((err) => {
      this.showStatus("Error: " + err.message, true, {
          label: "Reload",
          handler: () => this.retryConnection()
      });
      this.dispatchEvent(new CustomEvent('error', { detail: err }));
    });
  }
  ```

- **Public API Changes**:
  - `HeliosController` interface expansion (internal mostly, but exported).
  - `<helios-player>` will dispatch `error` events.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `BridgeController` tests verify `HELIOS_ERROR` messages trigger callbacks.
  - `DirectController` tests verify iframe error events trigger callbacks.
- **Edge Cases**:
  - Cross-origin iframes: `bridge.ts` captures full error details before they become "Script error" and sends them over postMessage.
  - Multiple error listeners: Ensure `onError` supports multiple subscribers (or at least one).

#### 5. Pre Commit Steps
- Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
