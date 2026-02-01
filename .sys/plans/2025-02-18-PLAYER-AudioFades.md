# 2025-02-18-PLAYER-AudioFades.md

#### 1. Context & Goal
- **Objective**: Implement audio fade-in and fade-out support in the client-side exporter to match preview behavior.
- **Trigger**: The `ClientSideExporter` currently ignores `data-helios-fade-in` and `data-helios-fade-out` attributes, resulting in abrupt audio cuts in exported videos.
- **Impact**: Ensures parity between the in-browser preview (powered by `DomDriver`) and the final exported video, improving output quality.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/features/audio-utils.ts`: Update `AudioAsset` interface and `mixAudio` logic.
  - `packages/player/src/features/audio-utils.test.ts`: Add unit tests for fade parsing and application.
- **Read-Only**:
  - `packages/core/src/drivers/DomDriver.ts` (Reference for fade logic behavior)

#### 3. Implementation Spec
- **Architecture**:
  - Extend the `AudioAsset` interface to carry fade durations.
  - Update `getAudioAssets` to parse these durations from DOM attributes.
  - Use Web Audio API's `AudioParam` automation methods in `mixAudio` to apply the fades during offline rendering.
- **Pseudo-Code**:
  - **In `getAudioAssets`**:
    - Parse `data-helios-fade-in` as float (default 0).
    - Parse `data-helios-fade-out` as float (default 0).
    - Add to returned `AudioAsset`.
  - **In `mixAudio`**:
    - For each asset:
      - Create `GainNode`.
      - Calculate `playbackStart` (context time) based on `startTime` and `rangeStart`.
      - If `fadeInDuration > 0`:
        - `gain.setValueAtTime(0, playbackStart)`
        - `gain.linearRampToValueAtTime(targetVolume, playbackStart + fadeInDuration)`
      - If `fadeOutDuration > 0`:
        - Calculate `playbackEnd = playbackStart + (sourceDuration or bufferDuration)`
        - `gain.setValueAtTime(targetVolume, playbackEnd - fadeOutDuration)`
        - `gain.linearRampToValueAtTime(0, playbackEnd)`
      - Ensure logic handles cases where the clip starts before the range (negative `playbackStart`) by adjusting the automation times correctly relative to the context time (which starts at 0).
- **Public API Changes**: None (Internal utility update).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player` to execute the updated test suite.
- **Success Criteria**:
  - New test `should parse fade attributes` passes in `audio-utils.test.ts`.
  - New test `should schedule fade automation` passes (verifying mock calls to `setValueAtTime` and `linearRampToValueAtTime`).
  - Existing tests pass without regression.
- **Edge Cases**:
  - Fade duration longer than clip duration.
  - Fade out starting before fade in ends.
  - Clips starting before the export range (negative relative start time) - automation times must be `>= 0`.
