# 2026-01-29-PLAYER-Implement-Deep-Media-API-Parity.md

#### 1. Context & Goal
- **Objective**: Implement missing `HTMLMediaElement` properties (`error`, `currentSrc`, `crossOrigin`, `defaultMuted`, `defaultPlaybackRate`) on `<helios-player>` to achieve full API parity.
- **Trigger**: Journal entry identifying gaps preventing compatibility with third-party video wrappers.
- **Impact**: Enables `<helios-player>` to be used as a drop-in replacement in libraries expecting a standard video element interface.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Add `error`, `currentSrc`, `crossOrigin`, `defaultMuted`, `defaultPlaybackRate` properties and backing fields. Update `observedAttributes` to include `crossorigin`. Update error handling logic.
  - `packages/player/src/api_parity.test.ts`: Add tests for new properties.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: To reference `onError` behavior.

#### 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosPlayer` class with new properties.
  - Use private backing fields for `_error` and `_defaultPlaybackRate`.
- **Public API Changes**:
  - `readonly error: MediaError | null`
  - `readonly currentSrc: string`
  - `crossOrigin: string | null`
  - `defaultMuted: boolean`
  - `defaultPlaybackRate: number`
- **Logic**:
  - **`error`**:
    - Add private `_error: MediaError | null = null`.
    - Getter returns `_error`.
    - Update `setController`'s `onError` callback:
      - When an error occurs, create a mock `MediaError` object: `{ code: 0, message: err.message || String(err) }` (mimicking `MediaError` interface).
      - Set `this._error` to this object.
      - Dispatch the `error` event.
    - Reset `this._error = null` in `loadIframe()` (start of loading) and `load()` methods.
  - **`currentSrc`**:
    - Getter: Return `this.iframe.src` if `src` attribute is set, otherwise empty string. (The `iframe.src` property returns the absolute URL).
  - **`crossOrigin`**:
    - Getter: Return `this.getAttribute('crossorigin')`.
    - Setter: `val ? this.setAttribute('crossorigin', val) : this.removeAttribute('crossorigin')`.
    - Add `crossorigin` to `observedAttributes` array.
  - **`defaultMuted`**:
    - Getter: Return `this.hasAttribute('muted')`.
    - Setter: `val ? this.setAttribute('muted', '') : this.removeAttribute('muted')`.
  - **`defaultPlaybackRate`**:
    - Add private `_defaultPlaybackRate: number = 1.0`.
    - Getter: Return `this._defaultPlaybackRate`.
    - Setter: Set `this._defaultPlaybackRate = val`.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New tests in `api_parity.test.ts` pass:
    - `error` is null initially.
    - `error` is set correctly after simulating a controller error (mocking `onError` trigger).
    - `currentSrc` returns absolute URL matching `src`.
    - `crossOrigin` reflects attribute changes.
    - `defaultMuted` reflects `muted` attribute changes.
    - `defaultPlaybackRate` can be set and retrieved.
- **Edge Cases**:
  - `currentSrc` when no `src` attribute is present (should be empty string).
  - `error` is cleared when a new load starts.
