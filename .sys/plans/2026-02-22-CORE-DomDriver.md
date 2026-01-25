#### 1. Context & Goal
- **Objective**: Implement a new `DomDriver` in `packages/core` that synchronizes both Web Animations API (WAAPI) and `HTMLMediaElement` (Audio/Video) with the Helios timeline.
- **Trigger**: The current `WaapiDriver` only handles CSS/WAAPI animations, leaving `<audio>` and `<video>` elements unsynchronized during preview (playback and seeking).
- **Impact**: Enables proper audio/video preview in the browser. Users will hear audio and see video elements sync correctly when playing or scrubbing the timeline.

#### 2. File Inventory
- **Create**:
  - `packages/core/src/drivers/DomDriver.ts`: The new driver implementation.
  - `packages/core/src/drivers/DomDriver.test.ts`: Unit tests for the new driver.
- **Modify**:
  - `packages/core/src/drivers/TimeDriver.ts`: Update `TimeDriver` interface to accept playback state and rate.
  - `packages/core/src/drivers/index.ts`: Export the new driver.
  - `packages/core/src/index.ts`: Update `Helios` to use `DomDriver` by default and pass state to `driver.update()`.
  - `packages/core/src/drivers/WaapiDriver.ts`: Add deprecation comment.
- **Read-Only**:
  - `packages/core/src/drivers/RafTicker.ts`

#### 3. Implementation Spec
- **Architecture**:
  - **DomDriver**: A unified driver that queries the `scope` (Document or HTMLElement) for:
    - `Animation` objects (via `getAnimations()`).
    - `HTMLMediaElement` objects (via `querySelectorAll('audio, video')`).
  - **Synchronization Logic**:
    - **WAAPI**: Continue strictly setting `currentTime` (scrubbing), as they are visual state only.
    - **Media Elements**:
      - Sync `playbackRate`.
      - Handle `play()`/`pause()` based on `Helios.isPlaying`.
      - **Drift Correction**: Only set `currentTime` if the element has drifted significantly (> 0.2s) or if `!isPlaying` (scrubbing). This prevents audio stuttering during playback.

- **Interface Changes**:
  - **`packages/core/src/drivers/TimeDriver.ts`**:
    ```typescript
    export interface TimeDriver {
      init(scope: HTMLElement | Document): void;
      update(timeInMs: number, options?: { isPlaying: boolean; playbackRate: number }): void;
    }
    ```

- **Pseudo-Code (`DomDriver.update`)**:
  ```typescript
  update(timeInMs, { isPlaying, playbackRate } = { isPlaying: false, playbackRate: 1 }) {
    // 1. Sync WAAPI (Existing logic)
    animations.forEach(anim => {
      anim.currentTime = timeInMs;
      anim.pause(); // WAAPI is always scrubbed by Helios
    });

    // 2. Sync Media Elements
    const timeInSeconds = timeInMs / 1000;
    const mediaElements = scope.querySelectorAll('audio, video');

    mediaElements.forEach(media => {
      // Sync Playback Rate
      if (media.playbackRate !== playbackRate) media.playbackRate = playbackRate;

      if (isPlaying) {
        // Playback Mode
        if (media.paused) media.play().catch(e => { /* Handle autoplay policy */ });

        // Drift Correction (only seek if significantly off)
        const diff = Math.abs(media.currentTime - timeInSeconds);
        if (diff > 0.25) { // 250ms tolerance
          media.currentTime = timeInSeconds;
        }
      } else {
        // Scrubbing Mode
        if (!media.paused) media.pause();

        // Always seek to exact time
        if (Math.abs(media.currentTime - timeInSeconds) > 0.001) {
            media.currentTime = timeInSeconds;
        }
      }
    });
  }
  ```

- **Public API Changes**:
  - `Helios` uses `DomDriver` by default when `autoSyncAnimations: true`.
  - `TimeDriver` interface expanded (backward compatible via optional `options`).

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `DomDriver` unit tests pass.
  - `Helios` integration tests (if any) pass.
- **Edge Cases**:
  - `play()` failing due to autoplay policy (should be caught).
  - Rapid seeking.
  - Variable playback rates.
