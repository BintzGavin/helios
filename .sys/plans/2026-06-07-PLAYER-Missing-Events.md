#### 1. Context & Goal
- **Objective**: Implement dispatching of missing standard HTMLMediaElement events (`suspend`, `stalled`, `waiting`) in `HeliosPlayer` to achieve full API parity with `README.md`.
- **Trigger**: The Planner identified that while the event handler properties (`onsuspend`, `onstalled`, `onwaiting`) are documented and present in the `HeliosPlayer` API, the events themselves are never actually dispatched by the player implementation.
- **Impact**: Brings the `HeliosPlayer` component into full compliance with the documented API parity for HTMLMediaElement events.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts` (Implement event dispatch logic for `suspend`, `stalled`, `waiting`)
- **Read-Only**: `packages/player/README.md` (Verify event definitions), `docs/status/PLAYER.md`

#### 3. Implementation Spec
- **Architecture**:
  - HTMLMediaElement Standard Event semantics:
    - `suspend`: Dispatched when the browser intentionally does not fetch media data anymore (e.g., buffering is complete or paused). Dispatch this after `canplaythrough` when `_networkState` becomes `NETWORK_IDLE`.
    - `waiting`: Dispatched when playback stops because of a temporary lack of data. Since Helios generates frames synchronously, dispatch `waiting` when `play()` is called but `isLoaded` is false.
    - `stalled`: Dispatched when the user agent is trying to fetch media data, but data is unexpectedly not forthcoming. Can be dispatched in `loadIframe` timeout or error scenarios.
  - Let's dispatch `suspend` immediately after `canplaythrough` (since all data is "buffered").
  - Let's dispatch `waiting` when `play()` is called but `isLoaded` is false (or during iframe load if `autoplay` is true).
  - Let's dispatch `stalled` if the bridge connection times out or fails (e.g. in the `onerror` handler).

- **Pseudo-Code**:
  ```typescript
  // in index.ts around line 2776 where lifecycle events are dispatched
  this.dispatchEvent(new Event('canplay'));
  this.dispatchEvent(new Event('canplaythrough'));
  this.dispatchEvent(new Event('suspend')); // All local data loaded

  // in loadIframe() or play()
  if (this._networkState === HeliosPlayer.NETWORK_LOADING && this.autoplay) {
      this.dispatchEvent(new Event('waiting'));
  }

  // in connection error handler or timeout
  this.dispatchEvent(new Event('stalled'));
  ```

- **Public API Changes**: No new public API, just dispatching standard events.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: The tests should pass, and the events `suspend`, `stalled`, `waiting` should be verifiable if tested.
- **Edge Cases**: Ensure the events do not crash the player and fire at appropriate lifecycle moments.
