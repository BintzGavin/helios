# 📋 Spec: Improved Scrubber UX

#### 1. Context & Goal
- **Objective**: Improve the timeline scrubber to support smooth dragging without fighting the playback cursor, and auto-pause/resume during interaction.
- **Trigger**: "UI Controls" vision gap - current scrubber implementation fights the user during playback and lacks standard "pause-on-scrub" behavior.
- **Impact**: Significantly better UX for previewing and reviewing compositions, aligning with standard video player behavior.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement scrubber logic)
- **Modify**: `packages/player/src/index.test.ts` (Add verification tests)

#### 3. Implementation Spec
- **Architecture**:
  - Introduce internal state `isScrubbing` (boolean) and `wasPlayingBeforeScrub` (boolean) to `HeliosPlayer`.
  - Bind `mousedown` (Start) and `change` (End) events to the scrubber input.
  - `input` event remains for seeking but will now rely on `isScrubbing` state for coordination.

- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer {
    private isScrubbing = false;
    private wasPlayingBeforeScrub = false;

    connectedCallback() {
      // ... existing
      scrubber.addEventListener('mousedown', handleScrubStart);
      scrubber.addEventListener('change', handleScrubEnd);
    }

    handleScrubStart() {
      if (!controller) return;
      isScrubbing = true;
      wasPlayingBeforeScrub = controller.getState().isPlaying;
      if (wasPlayingBeforeScrub) controller.pause();
    }

    handleScrubEnd() {
      if (!controller) return;
      isScrubbing = false;
      if (wasPlayingBeforeScrub) controller.play();
    }

    updateUI(state) {
      // ... existing logic
      if (!isScrubbing) {
        scrubber.value = state.currentFrame;
      }
      // ... existing logic
    }
  }
  ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `should pause playback while scrubbing and resume after` test passes.
  - `should not resume playback after scrubbing if originally paused` test passes.
- **Edge Cases**:
  - Scrubbing while paused: Should remain paused after release.
  - Update received while scrubbing: Scrubber handle should NOT move, but time display SHOULD update.
