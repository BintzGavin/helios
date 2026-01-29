# 2026-03-01-PLAYER-StandardMediaStates.md

#### 1. Context & Goal
- **Objective**: Implement `error` and `currentSrc` properties on `<helios-player>` to satisfy `HTMLMediaElement` interface requirements.
- **Trigger**: Journal entry identifying missing properties ("Deep API Parity") that cause compatibility issues with video wrapper libraries.
- **Impact**: Enables third-party video libraries (e.g., React Player, Video.js wrappers) to correctly detect errors and resolved source URLs.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add properties and state management)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add verification tests)
- **Read-Only**: `packages/player/src/controllers.ts`

#### 3. Implementation Spec
- **Architecture**:
  - `currentSrc`: Expose the `iframe.src` property (which returns the fully resolved URL) to match `HTMLMediaElement.currentSrc`.
  - `error`: Manage an internal `_error` state of type `MediaError | null`.
  - Map internal Helios errors to standard `MediaError` codes where possible (defaulting to `MEDIA_ERR_NETWORK` for connection issues).
- **Public API Changes**:
  - `readonly error: MediaError | null`
  - `readonly currentSrc: string`
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    private _error: MediaError | null = null;

    // ... in loadIframe()
    this._error = null; // Clear error on new load

    // ... in setController error handler
    // We can cast a plain object to MediaError since the constructor isn't standard
    this._error = { code: 2, message: err.message } as MediaError; // MEDIA_ERR_NETWORK

    get error() { return this._error; }

    get currentSrc() { return this.iframe.src; }
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `currentSrc` returns absolute URL when `src` attribute is relative.
  - `error` is null initially.
  - `error` returns an object with `code` and `message` after a simulated error.
  - `error` is cleared when `src` changes.
- **Edge Cases**:
  - Accessing `currentSrc` before `src` is set (should be empty string).
  - Error occurring before controller connection (e.g., timeout).
