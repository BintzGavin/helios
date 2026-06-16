#### 1. Context & Goal
- **Objective**: Improve test coverage for `PlaybackControls.tsx` to 100%.
- **Trigger**: The current test coverage for `PlaybackControls.tsx` is only 50%, missing several handler functions like `handlePlayPause`, `handleRewind`, `handlePrevFrame`, `handleNextFrame`, and `handleSpeedChange`. This is part of a routine effort to improve test coverage in areas where no active vision gaps are currently defined.
- **Impact**: Increased confidence in the robustness and correctness of the playback control logic.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/studio/src/components/Controls/PlaybackControls.test.tsx` (Add tests for remaining functions)
- **Read-Only**: `packages/studio/src/components/Controls/PlaybackControls.tsx`

#### 3. Implementation Spec
- **Architecture**: Standard Vitest and React Testing Library setup.
- **Pseudo-Code**:
  - Add test for `handleSpeedChange` by firing a change event on the speed select element.
  - Add test for `handlePlayPause` toggling between play and pause.
  - Add test for `handlePlayPause` restarting from `inPoint` if at or past the end of the `loopEnd`.
  - Add test for `handleRewind` calling `seek(inPoint)`.
  - Add test for `handlePrevFrame` calling `seek` with `currentFrame - 1` (and not below 0).
  - Add test for `handleNextFrame` calling `seek` with `currentFrame + 1`.
  - Add a test that verifies no actions are performed if `controller` is `null`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage src/components/Controls/PlaybackControls.test.tsx`
- **Success Criteria**: The test passes and the coverage report for `PlaybackControls.tsx` shows 100% (or very close to it) for lines, branches, and functions.
- **Edge Cases**: Ensure no action is taken when `controller` is `null` (e.g. before initialization). Testing bounds for `Math.max(0, currentFrame - 1)`.
