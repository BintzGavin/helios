# Plan: Implement Loop Support

## 1. Context & Goal
- **Objective**: Implement playback looping capability in the `Helios` class.
- **Trigger**: Closing a vision gap for feature parity with `HTMLMediaElement` and enabling seamless background animations.
- **Impact**: Unlocks use cases like looping backgrounds, GIFs, and continuous installation displays.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Add loop state, method, and tick logic)
- **Modify**: `packages/core/src/index.test.ts` (Add unit tests for looping behavior)
- **Read-Only**: `packages/core/src/drivers/DomDriver.ts`

## 3. Implementation Spec
- **Architecture**: Extend the `Helios` state machine to include a `loop` property. Update the `onTick` method to handle wrap-around logic when `loop` is active.
- **Public API Changes**:
    - `HeliosOptions`: Add `loop?: boolean`.
    - `HeliosState`: Add `loop: boolean`.
    - `Helios` class:
        - Add `public get loop(): ReadonlySignal<boolean>`.
        - Add `public setLoop(shouldLoop: boolean): void`.
- **Pseudo-Code (onTick)**:
    ```typescript
    nextFrame = currentFrame + delta;
    if (loop) {
        if (rate > 0 && nextFrame >= totalFrames) {
            nextFrame = nextFrame % totalFrames;
        } else if (rate < 0 && nextFrame < 0) {
            // JS modulo can return negative, so careful handling
            nextFrame = totalFrames + (nextFrame % totalFrames);
        }
    } else {
        // Existing clamp and pause logic
        if (rate > 0 && nextFrame >= totalFrames) { ... pause ... }
        if (rate < 0 && nextFrame <= 0) { ... pause ... }
    }
    ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `loop` state is correctly initialized and updated.
    - When `loop` is true, playback continues from start after reaching the end.
    - When `loop` is true, reverse playback continues from end after reaching 0.
    - When `loop` is false, playback pauses at ends (regression test).
- **Edge Cases**:
    - Looping with very high playback rates.

## 5. Pre-Commit Instructions
- Complete pre-commit steps to make sure proper testing, verifications, reviews and reflections are done.
