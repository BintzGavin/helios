#### 1. Context & Goal
- **Objective**: Implement missing event dispatches for `abort`, `emptied`, and `progress` to improve API parity with `HTMLMediaElement`.
- **Trigger**: The event handler properties `onabort`, `onemptied`, and `onprogress` exist, and their respective events are documented, but the `HeliosPlayer` never actually dispatches these events, creating an API parity gap.
- **Impact**: Standard media events like `progress` and `emptied` will fire, allowing standard wrappers to react to media loading states properly.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add `this.dispatchEvent(new Event('...'))` for `abort`, `emptied`, and `progress` at appropriate lifecycle points).
- **Modify**: `packages/player/src/index.test.ts` (Add tests to verify these events are dispatched).

#### 3. Implementation Spec
- **Architecture**: Web Component Event Dispatching.
- **Pseudo-Code**:
  ```typescript
  // In loadIframe() or load(), dispatch 'abort' if there's a pending load being cancelled.
  // Dispatch 'emptied' when networkState transitions back to HAVE_NOTHING (e.g. at the start of loadIframe)
  // Dispatch 'progress' periodically during loading or when data is received.
  ```
  Specifically, in `loadIframe`:
  ```typescript
    if (this._networkState === HeliosPlayer.NETWORK_LOADING) {
        this.dispatchEvent(new Event('abort'));
    }
    this._networkState = HeliosPlayer.NETWORK_LOADING;
    this._readyState = HeliosPlayer.HAVE_NOTHING;
    this.dispatchEvent(new Event('emptied'));
    this.dispatchEvent(new Event('loadstart'));
  ```
  In the `setInterval` loop in `loadIframe` waiting for ready:
  ```typescript
    // Inside the polling interval
    this.dispatchEvent(new Event('progress'));
  ```
- **Public API Changes**: None (events are already documented).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: Tests pass and verify that `abort`, `emptied`, and `progress` events are dispatched during the player's lifecycle.
- **Edge Cases**: Ensure `abort` only fires if there was an active load.
