#### 1. Context & Goal
- **Objective**: Implement `playbackRate` support for variable speed and reverse playback, and export the `HeliosOptions` interface.
- **Trigger**: Vision Gap - README promises "variable speed playback (including reverse)" for future Studio features, and `HeliosOptions` is currently internal-only (DX issue).
- **Impact**: Enables fast-forward, slow-motion, and reverse playback in the Player/Studio, and allows consumers to properly type-check configuration objects.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/core/src/index.ts`: Add `playbackRate` to state, logic to `tick`, and export `HeliosOptions`.
  - `packages/core/src/index.test.ts`: Add tests for rate changes, reverse playback, and boundary conditions.
- **Read-Only**:
  - `README.md`

#### 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosState` with `playbackRate` (default 1.0).
  - Update `tick()` loop to increment `currentFrame` by `playbackRate` instead of hardcoded `1`.
  - Implement boundary checks for both end (forward) and start (reverse).
  - Export `HeliosOptions` for public consumption.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/index.ts

  // 1. Export Interface
  export interface HeliosOptions {
    // ... existing fields
    playbackRate?: number; // New optional field
  }

  // 2. Update State
  export type HeliosState = {
    // ... existing fields
    playbackRate: number;
  };

  // 3. Update Class
  export class Helios {
    constructor(options: HeliosOptions) {
      // ... existing validation
      this.state = {
        // ... existing fields
        playbackRate: options.playbackRate ?? 1,
      };
    }

    public setPlaybackRate(rate: number) {
      this.setState({ playbackRate: rate });
    }

    private tick = () => {
      if (!this.state.isPlaying) return;

      // Handle timeline binding (existing logic remains)
      if (this.syncWithDocumentTimeline) {
         this.animationFrameId = requestAnimationFrame(this.tick);
         return;
      }

      const { currentFrame, playbackRate, duration, fps } = this.state;
      const totalFrames = duration * fps;
      const nextFrame = currentFrame + playbackRate;

      // Forward Boundary
      if (playbackRate > 0 && nextFrame >= totalFrames) {
        this.setState({ currentFrame: totalFrames - 1, isPlaying: false });
        this.pause();
        return;
      }

      // Reverse Boundary
      if (playbackRate < 0 && nextFrame < 0) {
        this.setState({ currentFrame: 0, isPlaying: false });
        this.pause();
        return;
      }

      this.setState({ currentFrame: nextFrame });

      if (this.autoSyncAnimations) {
        this.syncDomAnimations((nextFrame / this.state.fps) * 1000);
      }

      this.animationFrameId = requestAnimationFrame(this.tick);
    };
  }
  ```
- **Public API Changes**:
  - `HeliosOptions`: Exported, added `playbackRate?`.
  - `HeliosState`: Added `playbackRate`.
  - `Helios`: Added `setPlaybackRate(rate: number)`.
- **Dependencies**:
  - `2026-01-22-CORE-InputProps.md` (Recommended to execute first to avoid merge conflicts in `index.ts`).

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
  - New tests pass:
    - `should initialize with custom playbackRate`
    - `should update playbackRate`
    - `should advance frames according to playbackRate` (e.g. rate=2 moves 2 frames)
    - `should reverse frames when rate is negative`
    - `should stop at 0 when playing in reverse`
- **Edge Cases**:
  - Rate = 0 (Should effectively pause, though `isPlaying` remains true? Or should we block 0? HTML5 video allows 0).
  - Rate = very high value (skip to end).
  - Changing rate while playing.
