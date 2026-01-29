# 1. Context & Goal
- **Objective**: Implement `error` and `currentSrc` properties on `<helios-player>` to achieve full Standard Media API parity.
- **Trigger**: Vision gap identified in `.jules/PLAYER.md` and `docs/status/PLAYER.md`; third-party video wrappers (e.g., React Player) rely on these properties to diagnose playback failures and confirm source loading.
- **Impact**: Enables better interoperability with standard video libraries and improves error handling for consumers.

# 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement properties and logic)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add verification tests)
- **Modify**: `packages/player/package.json` (Update `@helios-project/core` dependency to `2.7.1` to match workspace)

# 3. Implementation Spec
- **Architecture**:
  - Add `error` getter returning a `MediaError`-like object (code + message).
  - Add `currentSrc` getter returning the absolute URL of the active source.
  - Manage `_error` state: clear on load, set on controller error.
  - **Dependency Fix**: Update package dependencies to fix workspace resolution issues found during planning.
- **Pseudo-Code**:
  - **Class HeliosPlayer**:
    - Define private state `_error` initialized to null.
    - **Getter error**: Return `_error`.
    - **Getter currentSrc**:
      - Retrieve `src` attribute.
      - If empty, return empty string.
      - Attempt to resolve absolute URL against `document.baseURI`.
      - Return resolved URL (or fallback to attribute value on failure).
    - **Method loadIframe**:
      - Clear `_error` state (set to null).
      - Proceed with existing loading logic.
    - **Method setController**:
      - Subscribe to controller's error stream.
      - **On Error**:
        - Construct an object matching the `MediaError` shape (code + message).
        - Map error code to `MEDIA_ERR_SRC_NOT_SUPPORTED` (4) as default.
        - Update `_error` state.
        - Dispatch standard 'error' event.
- **Public API Changes**:
  - New read-only property `error: MediaError | null`.
  - New read-only property `currentSrc: string`.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `api_parity.test.ts` passes with new tests for `error` and `currentSrc`.
  - `currentSrc` returns absolute URL.
  - `error` returns correct object after a simulated error.
- **Edge Cases**:
  - `currentSrc` when `src` is empty.
  - `error` is cleared when a new load starts.
