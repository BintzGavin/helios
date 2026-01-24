# 2026-01-24-CORE-PlaybackRate

#### 1. Context & Goal
- **Objective**: Implement time-based ticking to support variable playback rates and ensure frame accuracy independent of browser refresh rate.
- **Trigger**: Vision Gap (Helios Studio requires variable speed/reverse playback) and Critical Bug (Current `tick` implementation ties playback speed to monitor refresh rate).
- **Impact**: Enables `playbackRate` control (2x, 0.5x, -1x) and fixes a major timing bug where video played too fast/slow on different screens. Also fixes the `HeliosOptions` export visibility issue.

#### 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Implement logic and export types)
- **Modify**: `packages/core/src/index.test.ts` (Add tests for new features and timing logic)
- **Read-Only**: `packages/core/package.json`

#### 3. Implementation Spec
- **Architecture**: Move from "Frame-Count Ticking" (increment frame by 1 every tick) to "Time-Based Ticking" (calculate delta time between ticks).
- **Public API Changes**:
  - `export interface HeliosOptions` (Currently private, needs to be public).
  - Update `HeliosState`: Add `playbackRate: number` (default `1`).
  - Add method `setPlaybackRate(rate: number): void`.
- **Pseudo-Code**:
  ```typescript
  // In Class Helios
  private lastFrameTime: number = 0;

  play() {
    if (isPlaying) return;
    this.setState({ isPlaying: true });
    this.lastFrameTime = performance.now(); // Reset time anchor
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  tick = () => {
    if (!isPlaying) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Calculate frame advancement
    // frameDelta = (ms / 1000) * fps * playbackRate
    const frameDelta = (deltaTime / 1000) * this.state.fps * this.state.playbackRate;

    const nextFrame = this.state.currentFrame + frameDelta;

    // Handle bounds (0 to totalFrames)
    // If loop reached end, pause or loop (currently just pause)
    // ... update state ...
  }
  ```

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `HeliosOptions` is exported.
  - `playbackRate` initializes to 1.
  - `setPlaybackRate(2)` updates state.
  - **Timing Test**: Mock `performance.now()` and `requestAnimationFrame`. Verify that passing 1000ms of time advances `fps * playbackRate` frames.
    - Example: FPS 30, Rate 2, Time 1s -> Advance 60 frames.
    - Example: FPS 30, Rate 0.5, Time 1s -> Advance 15 frames.
- **Edge Cases**:
  - Negative playback rate (reverse).
  - Playback rate 0 (should not advance).
  - High FPS monitors (ensure it doesn't run super fast).
