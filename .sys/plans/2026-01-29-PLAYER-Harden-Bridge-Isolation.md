# 2026-01-29-PLAYER-Harden-Bridge-Isolation.md

#### 1. Context & Goal
- **Objective**: Ensure multiple `<helios-player>` instances on the same page do not intercept each other's messages or state updates.
- **Trigger**: Code analysis revealed that `window.addEventListener('message')` handlers in `HeliosPlayer` and `BridgeController` do not filter by `event.source`, causing cross-talk.
- **Impact**: Enables reliable usage of multiple players (e.g., a gallery of compositions) without state pollution or race conditions.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Update `handleWindowMessage` to verify `event.source`.
  - `packages/player/src/controllers.ts`: Update `BridgeController.handleMessage`, `captureFrame`, and `getAudioTracks` to verify `event.source`.

#### 3. Implementation Spec
- **Architecture**: Enforce strict source verification for all `postMessage` listeners.
- **Pseudo-Code**:
  - In `HeliosPlayer.handleWindowMessage` (around line 937):
    ```typescript
    if (event.source !== this.iframe.contentWindow) return;
    ```
  - In `BridgeController.handleMessage` (around line 118):
    ```typescript
    if (event.source !== this.iframeWindow) return;
    ```
  - In `BridgeController.captureFrame` internal handler (around line 170):
    ```typescript
    if (event.source !== this.iframeWindow) return;
    ```
  - In `BridgeController.getAudioTracks` internal handler (around line 205):
    ```typescript
    if (event.source !== this.iframeWindow) return;
    ```

- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player && npm test -w packages/player`
- **Success Criteria**: Build passes and existing tests pass.
- **Edge Cases**:
  - `event.source` is null (ignored).
  - Iframe reloaded (source window object changes) - `HeliosPlayer` creates new controller with new window ref, so this is handled.
