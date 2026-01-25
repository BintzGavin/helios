# 2026-02-21-CORE-Refactor-Helios-Signals

## 1. Context & Goal
- **Objective**: Refactor the `Helios` class to use `Signal` primitives for internal state management and expose them as public APIs, while maintaining backward compatibility.
- **Trigger**: "Next Steps" in `docs/status/CORE.md` and README Roadmap "Architecture Hardening - Signal-Based State".
- **Impact**: Enables fine-grained reactivity for UI performance (avoiding full re-renders), completes the roadmap vision for architecture hardening, and prepares the core for high-performance integration.

## 2. File Inventory
- **Create**: None
- **Modify**: `packages/core/src/index.ts` (Implement signal-based state)
- **Read-Only**: `packages/core/src/signals.ts` (Reference for Signal API)

## 3. Implementation Spec
- **Architecture**:
  - Replace the monolithic `state` object and `Set<Subscriber>` pattern with individual `Signal<T>` instances for mutable state.
  - Implement the "Observer Pattern" via the `effect` primitive from `signals.ts` for the legacy `subscribe` method.
  - Expose `ReadonlySignal<T>` getters for public consumption.
- **Pseudo-Code**:
  ```typescript
  import { signal, effect, Signal, ReadonlySignal } from './signals';

  export class Helios {
    // Constants
    private duration: number;
    private fps: number;

    // Internal Signals
    private _currentFrame = signal(0);
    private _isPlaying = signal(false);
    private _inputProps = signal<Record<string, any>>({});
    private _playbackRate = signal(1);

    // Public Readonly Signals
    public get currentFrame(): ReadonlySignal<number> { return this._currentFrame; }
    public get isPlaying(): ReadonlySignal<boolean> { return this._isPlaying; }
    public get inputProps(): ReadonlySignal<Record<string, any>> { return this._inputProps; }
    public get playbackRate(): ReadonlySignal<number> { return this._playbackRate; }

    constructor(options: HeliosOptions) {
      this.duration = options.duration;
      this.fps = options.fps;

      // Initialize signals
      this._inputProps.value = options.inputProps || {};
      this._playbackRate.value = options.playbackRate ?? 1;

      // ... driver initialization ...
    }

    // Legacy State Access (Backward Compatibility)
    public getState(): Readonly<HeliosState> {
      return {
        duration: this.duration,
        fps: this.fps,
        currentFrame: this._currentFrame.value,
        isPlaying: this._isPlaying.value,
        inputProps: this._inputProps.value,
        playbackRate: this._playbackRate.value,
      };
    }

    // Legacy Subscription (Backward Compatibility)
    public subscribe(callback: Subscriber): () => void {
      return effect(() => {
        callback(this.getState());
      });
    }

    // Methods update signals directly
    public play() {
      if (this._isPlaying.peek()) return;
      this._isPlaying.value = true;
      // ... logic ...
    }

    public seek(frame: number) {
        // ... calculation ...
        this._currentFrame.value = newFrame;
        // ... driver update ...
    }

    // tick updates _currentFrame.value
    // setInputProps updates _inputProps.value
  }
  ```
- **Public API Changes**:
  - New properties on `Helios` instance: `currentFrame`, `isPlaying`, `inputProps`, `playbackRate` (all `ReadonlySignal`).
  - `getState()` and `subscribe()` behavior preserved.
  - `state` property (private) is removed.
- **Dependencies**: `packages/core/src/signals.ts` (Existing).

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - All existing unit tests pass (proving backward compatibility).
  - The `Helios` class exposes signal properties.
- **Edge Cases**:
  - `subscribe` must correctly unsubscribe when the returned function is called (handled by `effect` return value).
