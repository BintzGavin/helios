#### 1. Context & Goal
- **Objective**: Properly handle connection timeouts in `<helios-player>` by setting the `error` property and `networkState`, and dispatching an `error` event.
- **Trigger**: "Machine-readable, actionable errors" (Vision Gap).
- **Impact**: Enables programmatic error detection for AI agents and integration scripts (like Playwright tests) that need to know if loading failed.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update timeout logic)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for timeout behavior)
- **Read-Only**: `packages/player/src/controllers.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Update `startConnectionAttempts` in `HeliosPlayer`.
  - When the polling timeout (5000ms) is reached and no controller is connected:
    - Set `this._error` to a MediaError-like object (code 3 for NETWORK or 4 for SRC_NOT_SUPPORTED).
    - Set `this._networkState` to `NETWORK_NO_SOURCE` (3).
    - Dispatch a `CustomEvent('error', { detail: this._error })`.
    - Continue to show the status overlay ("Connection Failed").

- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/index.ts -> startConnectionAttempts()

  // ... inside timeout block ...
  if (Date.now() - startTime > 5000) {
      this.stopConnectionAttempts();
      if (!this.controller) {
          // Construct error object
          const err = {
              code: 4, // MEDIA_ERR_SRC_NOT_SUPPORTED
              message: "Connection Timed Out",
              MEDIA_ERR_ABORTED: 1,
              MEDIA_ERR_NETWORK: 2,
              MEDIA_ERR_DECODE: 3,
              MEDIA_ERR_SRC_NOT_SUPPORTED: 4
          };
          this._error = err;
          this._networkState = HeliosPlayer.NETWORK_NO_SOURCE;

          this.dispatchEvent(new CustomEvent('error', { detail: err }));

          this.showStatus("Connection Failed. Ensure window.helios is set or connectToParent() is called.", true);
      }
  }
  ```

- **Public API Changes**:
  - `player.error` will return an error object instead of `null` on timeout.
  - `player.networkState` will return `3` (NETWORK_NO_SOURCE) instead of `2` (NETWORK_LOADING) on timeout.
  - `error` event will be dispatched on timeout.

#### 4. Test Plan
- **Verification**: `npm test packages/player`
- **Success Criteria**:
  - New test case "should set error state and dispatch event on connection timeout" passes.
  - `player.error` is not null after timeout.
  - `player.networkState` is `NETWORK_NO_SOURCE` after timeout.
- **Edge Cases**:
  - Ensure `retryConnection` clears the error state (it calls `load()` which resets states).
