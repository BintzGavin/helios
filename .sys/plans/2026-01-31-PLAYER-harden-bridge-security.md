# 2026-01-31-PLAYER-harden-bridge-security

#### 1. Context & Goal
- **Objective**: Harden the `postMessage` bridge in `HeliosPlayer`, `BridgeController`, and `connectToParent` to prevent cross-talk between multiple player instances on the same page.
- **Trigger**: Discovery that global `message` event listeners do not verify `event.source`, allowing any iframe or window to hijack the player state or controller logic.
- **Impact**: Enables safe multi-player usage on a single page and improves security by ignoring untrusted messages. Also addresses missing documentation for attributes.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add source verification to `handleWindowMessage`)
- **Modify**: `packages/player/src/controllers.ts` (Add source verification to `BridgeController` message handlers)
- **Modify**: `packages/player/src/bridge.ts` (Add source verification to `connectToParent` listener)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for handshake and source verification)
- **Modify**: `packages/player/README.md` (Add missing attributes to documentation)

#### 3. Implementation Spec
- **Architecture**:
  - Enforce strict `event.source` checking in all `message` event listeners.
  - In `HeliosPlayer` (`src/index.ts`):
    - `handleWindowMessage`: Check `event.source === this.iframe.contentWindow`.
  - In `BridgeController` (`src/controllers.ts`):
    - `handleMessage`: Check `event.source === this.iframeWindow`.
    - `captureFrame`: Check `event.source === this.iframeWindow` in the one-off listener.
    - `getAudioTracks`: Check `event.source === this.iframeWindow` in the one-off listener.
    - `getSchema`: Check `event.source === this.iframeWindow` in the one-off listener.
  - In `connectToParent` (`src/bridge.ts`):
    - Global listener: Check `event.source === window.parent`.
- **Documentation**:
  - Update `packages/player/README.md` Attribute table to include:
    - `muted` (boolean): Audio mute state.
    - `export-caption-mode`: `burn-in` or `file`.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - All existing tests pass.
  - New tests for source verification pass.
- **Edge Cases**:
  - `iframe.contentWindow` being null (should be handled).
  - `window.parent` being same as `window` (top-level) - unlikely for iframe, but good to check.
