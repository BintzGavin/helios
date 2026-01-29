#### 1. Context & Goal
- **Objective**: Implement `error` and `currentSrc` properties on `<helios-player>` to achieve deeper parity with the `HTMLMediaElement` interface.
- **Trigger**: "Deep API Parity" learning in `.jules/PLAYER.md` and audit of missing standard properties.
- **Impact**: Improves compatibility with third-party video player wrappers (e.g., React Player, Video.js) that rely on these properties for error handling and source resolution.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add properties and state management)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for new properties)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for error handling)

#### 3. Implementation Spec
- **Architecture**:
  - Add `_error` state to `HeliosPlayer` class.
  - Implement getters for `error` and `currentSrc`.
  - Update error handling logic to populate `_error` state matching `MediaError` interface structure (code/message).
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    // 1. Add state
    private _error: { code: number; message: string } | null = null;

    // 2. Add Getters
    public get error() { return this._error; }
    public get currentSrc() { return this.iframe.src; }

    // 3. Clear error on load
    public load() {
      this._error = null;
      // ... existing logic
    }

    // 4. Set error on controller error
    private setController(controller) {
       // ...
       controller.onError((err) => {
         this._error = {
           code: 4, // MEDIA_ERR_SRC_NOT_SUPPORTED (Generic fallback)
           message: err.message || String(err)
         };
         this.showStatus(...) // Existing logic
         // ...
       });
    }

    // 5. Set error on connection failure
    private stopConnectionAttempts() {
       // ...
       if (!this.controller) {
          this._error = { code: 2, message: "Connection Failed" }; // MEDIA_ERR_NETWORK
          // ...
       }
    }

    // 6. Clear error on successful connection
    private startConnectionAttempts() {
        this._error = null; // Reset before trying
        // ...
    }
  }
  ```
- **Public API Changes**:
  - `player.error` (Read-only, returns object `{ code: number, message: string }` or `null`)
  - `player.currentSrc` (Read-only, returns string)
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `currentSrc` returns absolute URL of the iframe (verified via `iframe.src`).
  - `error` property is `null` initially.
  - `error` property contains `{ code: 4, message: ... }` after simulated controller error.
  - `error` property contains `{ code: 2, message: ... }` after simulated connection failure.
  - `error` is cleared (`null`) after calling `load()` or when `src` changes.
- **Edge Cases**:
  - `currentSrc` when `src` attribute is relative (should resolve to absolute).
  - Error state persistence across play/pause (should remain until resolved/reloaded).
