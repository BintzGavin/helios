# 2026-04-26-CORE-Time-Based-Control

#### 1. Context & Goal
- **Objective**: Implement a time-based control API (`currentTime`, `seekToTime`) in the `Helios` class to align with the "Video is Light Over Time" vision.
- **Trigger**: Vision Gap - The README emphasizes "Timeline control via `currentTime` manipulation", but the current API is primarily frame-based (`seek(frame)`, `currentFrame`).
- **Impact**: Enables easier integration with time-based systems (like WAAPI) and improves Developer Experience by providing a standard time unit (seconds) alongside frames.

#### 2. File Inventory
- **Modify**: `packages/core/src/index.ts`
  - Add `currentTime` to `HeliosState` interface.
  - Implement `_currentTime` computed signal.
  - Implement `get currentTime()` accessor.
  - Implement `seekToTime(seconds)` method.
  - Update `getState()` to return `currentTime`.

#### 3. Implementation Spec
- **Architecture**:
  - `currentTime` will be a `computed` signal derived from `_currentFrame` and `_fps` (`currentFrame / fps`).
  - `seekToTime(seconds)` will act as a facade, converting seconds to frames (`seconds * fps`) and calling `seek(frame)`.
  - This ensures `currentFrame` remains the single source of truth while providing a robust time-based view.
- **Pseudo-Code**:
  ```typescript
  // In HeliosState
  currentTime: number;

  // In Helios class
  private _currentTime: ReadonlySignal<number>;

  constructor() {
    // ...
    this._currentTime = computed(() => this._currentFrame.value / this._fps.value);
  }

  public get currentTime(): ReadonlySignal<number> { return this._currentTime; }

  public seekToTime(seconds: number) {
    const frame = seconds * this.fps;
    this.seek(frame);
  }

  public getState() {
    return {
      // ...
      currentTime: this._currentTime.value,
    };
  }
  ```
- **Public API Changes**:
  - `HeliosState`: Added `currentTime: number`.
  - `Helios`: Added `get currentTime(): ReadonlySignal<number>`.
  - `Helios`: Added `seekToTime(seconds: number): void`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `getState().currentTime` returns 0 on init.
  - `seekToTime(1.5)` sets `currentFrame` to `1.5 * fps`.
  - `seek(frame)` updates `currentTime`.
  - `currentTime` updates correctly during playback.
- **Edge Cases**:
  - `seekToTime` with negative values (should clamp to 0 via `seek`).
  - `seekToTime` beyond duration (should clamp via `seek`).
  - Changing FPS should preserve Time (this is already handled by `setFps` logic, but `currentTime` should remain stable).
