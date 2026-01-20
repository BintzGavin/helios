# Plan: Refactor Player Control Logic

## 1. Context & Goal
- **Objective**: Refactor `<helios-player>` to drive the `Helios` instance exposed by the composition (via `window.helios`) instead of relying on a non-standard `updateAnimationAtTime` method.
- **Source**: Derived from analyzing `examples/simple-canvas-animation/composition.html` and `packages/player/src/index.ts`.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
- **Read-Only**: `packages/core/src/index.ts`

## 3. Implementation Spec
- **Architecture**: The Player acts as a "Remote Control" for the logic engine running inside the iframe.
- **Logic**:
  1. On `iframe.load`:
     - Check `iframe.contentWindow.helios`.
     - If found:
       - Update local state (duration, fps) from the remote instance.
       - Subscribe to remote instance to update UI (scrubber, time display).
       - Store reference as `this.compositionHelios`.
  2. **Play/Pause**: Call `this.compositionHelios.play()` / `pause()`.
  3. **Seek**: Call `this.compositionHelios.seek(frame)`.
  4. **Export**:
     - Pause composition.
     - Loop from 0 to totalFrames.
     - Call `this.compositionHelios.seek(i)`.
     - Wait for frame (using `requestAnimationFrame` inside iframe).
     - Capture canvas.
- **Public API Changes**: None (internal logic change).

## 4. Test Plan
- **Verification**: `npm run build -w packages/player`.
- **Manual Check (Simulated)**: Verify that the code no longer calls `updateAnimationAtTime` and correctly references `contentWindow.helios`.
