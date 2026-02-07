# 2026-10-17-PLAYER-Fix-Async-Seek-State.md

#### 1. Context & Goal
- **Objective**: Fix the `seeking` property implementation in `HeliosPlayer` to correctly reflect the asynchronous seek state during programmatic seeks (setting `currentTime` or `currentFrame`), ensuring compliance with the Standard Media API.
- **Trigger**: The previous implementation of Async Seek (`v0.73.0`) failed to update the `seeking` property during programmatic seeks; it only reflected UI scrubbing state.
- **Impact**: Ensures that `player.seeking` is `true` while an async seek is in progress, allowing external tools (like exporters or tests) to correctly wait for seeking to complete.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer` class: add `_isSeeking` flag, update `seeking` getter, update `currentTime` setter).
- **Verify**: `packages/player/src/api_parity.test.ts` (Add verification test).

#### 3. Implementation Spec
- **HeliosPlayer**:
    - Add `private _isSeeking: boolean = false;`.
    - Update `get seeking()`: Return `this.isScrubbing || this._isSeeking`.
    - Update `set currentTime(val)` and `set currentFrame(val)`:
        1. Set `this._isSeeking = true`.
        2. Dispatch `seeking` event.
        3. Call `await this.controller.seek(...)`.
        4. Set `this._isSeeking = false`.
        5. Dispatch `seeked` event.
    - Ensure `fastSeek` also triggers this logic (it currently delegates to `currentTime` setter, so it should be fine).

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`.
- **New Test**: Add a test case in `src/api_parity.test.ts` or a new test file:
    - Set `player.currentTime = 10`.
    - Assert `player.seeking` is `true` immediately.
    - Wait for `seeked` event.
    - Assert `player.seeking` is `false`.
