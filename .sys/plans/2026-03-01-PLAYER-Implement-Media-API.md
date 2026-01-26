# Plan: Implement Standard Media API for Helios Player

## 1. Context & Goal
- **Objective**: Implement a subset of the standard `HTMLMediaElement` API (properties, methods, events) on the `<helios-player>` Web Component.
- **Trigger**: The current component lacks a standard programmatic interface (e.g., `.play()`, `currentTime`), forcing users to use the internal `getController()` or `getAudioTracks()`, which violates the "Predictable APIs" and "Agent Experience First" principles.
- **Impact**: Enables easier integration with external UIs (like Helios Studio), allows standard usage by agents/developers, and improves interoperability with tools expecting media element behavior.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement API and event dispatching)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for new API and events)

## 3. Implementation Spec
- **Architecture**:
    - Add `lastState` property to `HeliosPlayer` initialized to `null`.
    - In `updateUI(state)`, compare `state` with `lastState` and dispatch standard `CustomEvent`s:
        - `play` (when `isPlaying` becomes true)
        - `pause` (when `isPlaying` becomes false)
        - `ended` (when `currentFrame` reaches end)
        - `timeupdate` (when `currentFrame` changes)
        - `volumechange` (when `volume` or `muted` changes)
        - `ratechange` (when `playbackRate` changes)
        - `durationchange` (when `duration` changes)
    - Implement public getters/setters on `HeliosPlayer`:
        - `currentTime` (read/write, in seconds, calculated from `frame / fps`)
        - `currentFrame` (read/write, integer, proxy to `controller.seek`)
        - `duration` (read-only, in seconds)
        - `paused` (read-only, derived from state)
        - `ended` (read-only, derived from state)
        - `volume` (read/write, 0-1)
        - `muted` (read/write)
        - `playbackRate` (read/write)
        - `fps` (read-only)
    - Implement public methods:
        - `play()`: Promise<void> (calls `controller.play()`)
        - `pause()`: void (calls `controller.pause()`)
- **Pseudo-Code**:
    ```typescript
    export class HeliosPlayer extends HTMLElement {
        private lastState: any = null;

        public get currentTime() {
             if (!this.controller) return 0;
             const s = this.controller.getState();
             return s.currentFrame / s.fps;
        }
        public set currentTime(val: number) {
             if (this.controller) {
                 const s = this.controller.getState();
                 this.controller.seek(Math.floor(val * s.fps));
             }
        }
        // ... other getters/setters ...

        public async play() { this.controller?.play(); }
        public pause() { this.controller?.pause(); }

        private updateUI(state: any) {
            // ... existing UI logic ...

            // Event Dispatching
            if (this.lastState) {
                if (state.isPlaying !== this.lastState.isPlaying) {
                    this.dispatchEvent(new Event(state.isPlaying ? 'play' : 'pause'));
                }
                if (state.currentFrame !== this.lastState.currentFrame) {
                     this.dispatchEvent(new Event('timeupdate'));
                }
                // ... other events ...
            }
            this.lastState = state;
        }
    }
    ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/player` to execute Vitest unit tests.
- **Success Criteria**:
    - `player.play()` starts playback (verified via mock controller).
    - `player.currentTime` returns correct seconds.
    - Events `play`, `pause`, `timeupdate` fire on state changes.
- **Edge Cases**:
    - Accessing API before connection (should handle gracefully, e.g. return 0 or no-op).
    - Setting `currentTime` out of bounds (clamped by controller).
    - Event loop: Ensure events don't fire redundantly if state hasn't changed.
