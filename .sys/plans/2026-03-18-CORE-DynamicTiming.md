## 1. Context & Goal
- **Objective**: Implement `setDuration` and `setFps` methods in the `Helios` class to allow dynamic updates to composition timing.
- **Trigger**: Identified a gap where `duration` and `fps` are readonly constants, preventing runtime updates required by advanced use cases (e.g., Studio resizing the timeline).
- **Impact**: Enables consumers (like Studio) to update project settings without destroying and recreating the engine instance, preserving state and subscribers.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts`
  - Refactor `duration` and `fps` to be getters backed by private signals.
  - Implement `setDuration(seconds: number)`.
  - Implement `setFps(fps: number)`.
- **Modify**: `packages/core/src/index.test.ts`
  - Add tests for `setDuration` (basic update, frame clamping).
  - Add tests for `setFps` (time preservation, frame adjustment).

## 3. Implementation Spec
- **Architecture**:
  - The `Helios` class will maintain `_duration` and `_fps` as mutable internal state (using signals for consistency with `_width`/`_height`).
  - Public `duration` and `fps` properties will become getters.
  - Setters will enforce validation (positive values) and handle side effects (clamping current frame, syncing driver).

- **Pseudo-Code**:
  ```typescript
  class Helios {
    private _duration: Signal<number>;
    private _fps: Signal<number>;

    // Backward-compatible getters
    get duration() { return this._duration.value; }
    get fps() { return this._fps.value; }

    constructor(options) {
      this._duration = signal(options.duration);
      this._fps = signal(options.fps);
      // ... (initialize other signals)
    }

    setDuration(newDuration: number) {
      if (newDuration < 0) throw Error("INVALID_DURATION");
      this._duration.value = newDuration;

      const totalFrames = newDuration * this.fps;
      // Clamp current frame if it exceeds new duration
      if (this.currentFrame.peek() > totalFrames) {
        this.seek(totalFrames);
      }

      // Force driver sync since total duration changed (if driver uses duration)
      // Even if driver doesn't use duration, we might need to sync the state
    }

    setFps(newFps: number) {
      if (newFps <= 0) throw Error("INVALID_FPS");
      const oldFps = this.fps;

      // Calculate current time in seconds
      const currentTime = this.currentFrame.peek() / oldFps;

      this._fps.value = newFps;

      // Update frame to match the same time at new FPS
      // e.g. 1.0s @ 30fps = frame 30.
      // 1.0s @ 60fps = frame 60.
      this._currentFrame.value = currentTime * newFps;

      // Sync driver with new frame and playback rate
      this.driver.update(...)
    }
  }
  ```

- **Public API Changes**:
  - `duration` and `fps` properties on `Helios` instance change from `readonly` properties to getters (transparent to consumers).
  - New public method `setDuration(seconds: number): void`.
  - New public method `setFps(fps: number): void`.

- **Dependencies**:
  - None.

## 4. Test Plan
- **Verification**: Run `npx vitest packages/core` (or the equivalent command used in CI/root).
- **Success Criteria**:
  - `setDuration` updates the duration value.
  - `setDuration` correctly clamps `currentFrame` if the new duration is shorter than the current time.
  - `setFps` updates the FPS value.
  - `setFps` preserves the current playback time (adjusting the frame number accordingly).
  - Existing tests in `index.test.ts` continue to pass.
