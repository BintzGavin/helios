# 1. Context & Goal
- **Objective**: Ensure the poster image remains hidden after the user has interacted with the player (played or seeked), even if they return to the start (frame 0) while paused.
- **Trigger**: Currently, the poster reappears if the player is paused at frame 0, even if the user has previously played the video. This violates standard video player behavior and creates a jarring user experience.
- **Impact**: Improves the polish and "standard feeling" of the media player, preventing visual glitches during scrubbing.

# 2. File Inventory
- **Modify**:
  - `packages/player/src/index.ts`: Implement the `_hasPlayed` state and update visibility logic.
  - `packages/player/src/index.test.ts`: Add a regression test for the seek-to-zero scenario.
- **Read-Only**: None.

# 3. Implementation Spec
- **Architecture**: Introduce a private boolean flag `_hasPlayed` in `HeliosPlayer` to track if the playback session has "started" (meaning the user has seen content beyond the poster).
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    private _hasPlayed: boolean = false;

    // In loadIframe() or load()
    this._hasPlayed = false;

    // In updateUI(state)
    // Detect if we have "started"
    if (state.isPlaying || state.currentFrame > 0) {
      this._hasPlayed = true;
    }

    // Consolidate logic: Call the updater instead of modifying DOM directly here
    this.updatePosterVisibility();
    // REMOVE the previous direct DOM manipulation lines in updateUI that hid the poster

    // In updatePosterVisibility()
    // 1. If pendingSrc (preload=none), SHOW poster.
    // 2. If no poster attribute, HIDE poster.
    // 3. If poster attribute exists:
    //    If this._hasPlayed is true -> HIDE poster.
    //    Else -> SHOW poster.
    //    (Optional: Check current state in case _hasPlayed isn't updated yet,
    //     but updateUI sets it first, so logic is consistent)
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: Run `npm test packages/player` to execute the unit test suite.
- **Success Criteria**:
  - The new test case `should keep poster hidden after seeking back to start` passes.
  - The existing test `should hide poster when playing starts` continues to pass.
  - The existing test `should show poster and defer load when preload="none"` continues to pass.
- **Edge Cases**:
  - Calling `load()` programmatically should reset `_hasPlayed` to `false`, causing the poster to reappear (if `preload` allows or until play).
  - Scrubbing to 0 without ever playing (if possible via API) should ideally show/hide based on whether we consider "seeing frame 0" as "played". Usually, if `currentFrame` stays 0 and `isPlaying` is false, `_hasPlayed` remains false, so poster shows. This is acceptable for initial load state.
