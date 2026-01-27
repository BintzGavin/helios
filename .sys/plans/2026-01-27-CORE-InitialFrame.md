# Plan: Implement `initialFrame` in HeliosOptions

## 1. Context & Goal
- **Objective**: Add `initialFrame` support to `Helios` configuration to enable state restoration and improved HMR (Hot Module Replacement) experience.
- **Trigger**: Vision gap identified during "Studio IDE" and "Agent Experience" analysis. The current `Helios` class resets `currentFrame` to 0 on instantiation, making it impossible to preserve the playhead position during development reloads.
- **Impact**: Enables `packages/studio` and other tools to restore the playback position after a reload or HMR update, significantly improving the Developer Experience (DX). This addresses the "Hot Reloading" gap in the V1.x Roadmap.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts`
  - Update `HeliosOptions` interface.
  - Update `Helios` constructor logic.
- **Modify**: `packages/core/src/index.test.ts`
  - Add unit tests for `initialFrame` initialization and clamping.
- **Read-Only**: `packages/core/src/drivers/TimeDriver.ts` (Reference for `update` signature).

## 3. Implementation Spec
- **Architecture**: Extend the configuration object pattern. Use the new option to initialize the `_currentFrame` signal.
- **Logic Flow**:
  1.  In `Helios` constructor (inside `packages/core/src/index.ts`), read `options.initialFrame` (default to 0 if undefined).
  2.  Calculate `totalFrames = options.duration * options.fps`.
  3.  Clamp `initialFrame` between `0` and `totalFrames` (using `Math.max(0, Math.min(initialFrame, totalFrames))`).
  4.  Initialize `this._currentFrame` signal with the clamped value: `this._currentFrame = signal(initialFrame);`.
  5.  **Critical Step**: Call `this.driver.update()` immediately after `this.driver.init()` to ensure the environment (DOM/WAAPI) is synchronized with the `initialFrame`.
      - Calculate `initialTimeMs = (clampedInitialFrame / this.fps) * 1000`.
      - Call `this.driver.update(initialTimeMs, { ... })` with initial state (`isPlaying: false`, etc.).
- **Public API Changes**:
  - `HeliosOptions` interface: Add `initialFrame?: number;`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**:
  - `new Helios({ initialFrame: 10, ... })` results in `helios.currentFrame.peek() === 10`.
  - `new Helios({ initialFrame: 9999, duration: 1, fps: 10, ... })` results in `helios.currentFrame.peek() === 10` (Clamped to duration).
  - `new Helios({ initialFrame: -5, ... })` results in `helios.currentFrame.peek() === 0` (Clamped to 0).
  - Verify that the driver's `update` method is called during initialization (this might require spying on the driver or checking side effects if possible, but unit tests on `Helios` state are sufficient for the logic).
