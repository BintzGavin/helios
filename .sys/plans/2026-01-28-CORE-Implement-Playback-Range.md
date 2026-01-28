# Plan: Implement Playback Range

## 1. Context & Goal
- **Objective**: Implement `playbackRange` (start/end points) in the `Helios` core engine to restrict playback and looping to a specific time window.
- **Trigger**: The "Helios Studio" vision requires "Timeline scrubber with in/out markers", which necessitates engine-level support for playing/looping a specific range (Work Area).
- **Impact**: Enables Studio users to loop specific sections of a composition and allows developers to play subsets of a video programmatically.

## 2. File Inventory
- **Modify**: `packages/core/src/errors.ts` (Add `INVALID_PLAYBACK_RANGE` code)
- **Modify**: `packages/core/src/index.ts` (Add state, signal, methods, and update tick logic)
- **Modify**: `packages/core/src/index.test.ts` (Add unit tests for range logic)

## 3. Implementation Spec
- **Architecture**:
    - Extend `HeliosState` to include `playbackRange: [number, number] | null`.
    - Use a Signal `_playbackRange` to manage reactive state.
    - Update `onTick` to constrain `currentFrame` within the range if defined, replacing the default `0` to `duration` bounds.
- **Public API Changes**:
    - `HeliosState`: Add `playbackRange: [number, number] | null`.
    - `HeliosOptions`: Add `playbackRange?: [number, number]`.
    - `Helios`: Add `setPlaybackRange(start: number, end: number): void`.
    - `Helios`: Add `clearPlaybackRange(): void`.
    - `Helios`: Add getter `playbackRange`.
- **Logic**:
    - `setPlaybackRange` validates `start >= 0` and `end > start`.
        - Throws `INVALID_PLAYBACK_RANGE` if validation fails.
    - `onTick`:
        - Calculate `startFrame` and `endFrame` from range (if set) or defaults (0, duration).
        - If `loop` is true:
            - If `playbackRate > 0` and `nextFrame >= endFrame`, wrap to `startFrame`.
            - If `playbackRate < 0` and `nextFrame < startFrame`, wrap to `endFrame`.
        - If `loop` is false:
            - If `playbackRate > 0` and `nextFrame >= endFrame`, clamp to `endFrame` (or `endFrame - epsilon`) and pause.
            - If `playbackRate < 0` and `nextFrame <= startFrame`, clamp to `startFrame` and pause.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - `setPlaybackRange` correctly updates state.
    - `setPlaybackRange` throws on invalid inputs (negative start, end <= start).
    - Playback loops correctly within the defined range (e.g. 2s to 5s).
    - Playback stops correctly at the end of the range when not looping.
    - `clearPlaybackRange` restores full duration playback.
    - Constructor accepts `playbackRange`.
- **Edge Cases**:
    - Range extends beyond duration (engine should handle it gracefully or clamp).
    - Reverse playback with range.
