#### 1. Context & Goal
- **Objective**: Improve test coverage for the `mixAudio` function in `audio-utils.ts`.
- **Trigger**: The `audio-utils.ts` file has uncovered lines representing edge cases around fade overlap, initial fade out logic, and audio decoding errors (lines 169, 173-180, 189).
- **Impact**: Better coverage ensures robust handling of fade logic (overlaps and range interactions) and decoding errors within the client-side exporter pipeline.

#### 2. File Inventory
- **Create**: None
- **Modify**: packages/player/src/features/audio-utils.test.ts
- **Read-Only**: packages/player/src/features/audio-utils.ts

#### 3. Implementation Spec
- **Architecture**: No architectural changes. Focus on writing unit tests using Vitest.
- **Pseudo-Code**:
  - Add a test case to `audio-utils.test.ts` within the `mixAudio` describe block to handle overlapping fades (where `fadeOutStart < fadeInEndTime`). This will cover line 169.
  - Add a test case to `audio-utils.test.ts` to simulate a scenario where `fadeOutStart < 0` but `timeIntoFade < asset.fadeOutDuration` (which tests the `startVol` calculation). This covers lines 173-180.
  - Add a test case to `audio-utils.test.ts` to simulate `fadeOutStart < 0` and `timeIntoFade >= asset.fadeOutDuration` (setting gain to 0).
  - Add a test case to `audio-utils.test.ts` that triggers an error during `decodeAudioData` to cover the `catch` block warning (line 189).
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cd packages/player && npm run test -- --coverage | tail -n 25`
- **Success Criteria**: Coverage for `audio-utils.ts` should improve to 100%, and all tests must pass.
- **Edge Cases**: Fades overlapping, ranges starting in the middle of a fade-out, audio decoding failure.