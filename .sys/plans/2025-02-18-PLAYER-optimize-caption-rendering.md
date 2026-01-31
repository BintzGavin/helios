# 2025-02-18-PLAYER-optimize-caption-rendering.md

#### 1. Context & Goal
- **Objective**: Optimize `HeliosPlayer` caption rendering by implementing state diffing to prevent unnecessary DOM updates on every frame.
- **Trigger**: The current implementation clears and rebuilds `innerHTML` for captions in the `updateUI` loop (60fps), causing unnecessary layout thrashing and performance overhead.
- **Impact**: Reduces CPU/GPU usage during playback, improves battery life on mobile devices, and ensures smoother playback by eliminating redundant DOM operations.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement diffing logic in `updateUI`)
- **Read-Only**: `packages/player/src/features/text-tracks.ts`

#### 3. Implementation Spec
- **Architecture**:
    - Introduce a `lastCaptionsHash` private property to store a fingerprint (string hash) of the currently displayed captions.
    - In the `updateUI` loop, generate a fingerprint for the incoming `state.activeCaptions` (by joining cue texts).
    - Compare the new fingerprint with the stored one.
    - Only manipulate the DOM (`captionsContainer.innerHTML`) if the fingerprint has changed.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    private lastCaptionsHash: string = "";

    updateUI(state) {
      // ... existing UI updates ...

      // Caption Optimization
      const active = state.activeCaptions || [];
      const newHash = this.showCaptions ? active.map(c => c.text).join("|||") : "HIDDEN";

      if (newHash !== this.lastCaptionsHash) {
          this.captionsContainer.innerHTML = "";
          if (this.showCaptions && active.length > 0) {
              active.forEach(c => {
                  // ... create and append div ...
              });
          }
          this.lastCaptionsHash = newHash;
      }
    }
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    1. Run `npm run build -w packages/core` to ensure core is ready.
    2. Run `npm run build -w packages/renderer` to ensure renderer is ready.
    3. Run `npm run build -w packages/player` to ensure player builds with changes.
    4. Run `npm run build:examples` to prepare test fixtures.
    5. Run `npx tsx tests/e2e/verify-player.ts` to ensure player functionality (including interactivity) remains broken.
- **Success Criteria**:
    - Build succeeds.
    - E2E tests pass (proving no regression in player loading/playback).
    - Code review confirms `innerHTML` assignment is guarded by conditional check.
- **Edge Cases**:
    - `activeCaptions` is null/undefined.
    - `showCaptions` toggles from false to true.
    - `activeCaptions` changes from `[{text: "A"}]` to `[{text: "A"}, {text: "B"}]`.
