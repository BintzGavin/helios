# 2025-02-14 - Implement Range-Based Export

#### 1. Context & Goal
- **Objective**: Update the Client-Side Export feature to respect the active `playbackRange` (loop region) if set, exporting only the selected portion of the composition.
- **Trigger**: Vision Gap - "Client-Side Export" should allow users to export specific sections, but currently it always exports the full duration.
- **Impact**: Enables users to export loops or specific scenes without rendering the entire timeline.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/audio-utils.ts` (Update `mixAudio` signature and logic)
- **Modify**: `packages/player/src/features/exporter.ts` (Update export loop and audio mixing call)
- **Modify**: `packages/player/src/features/audio-utils.test.ts` (Add tests for range-based mixing)

#### 3. Implementation Spec
- **Architecture**:
  - `mixAudio` utility currently assumes full duration starting at 0. It needs to support an offset (`rangeStart`) to correctly calculate when audio clips should start playing relative to the export window.
  - `ClientSideExporter` needs to calculate the export window based on `state.playbackRange` and drive the render loop accordingly.

- **Pseudo-Code**:
  - **In `packages/player/src/features/audio-utils.ts`**:
    - Update `mixAudio(assets, duration, sampleRate, rangeStart = 0)`
    - Inside loop over assets:
      - `assetStart = asset.startTime || 0`
      - If `assetStart >= rangeStart`:
        - `when = assetStart - rangeStart` (Play after delay)
        - `offset = 0` (Start from beginning of clip)
      - Else (`assetStart < rangeStart`):
        - `when = 0` (Play immediately)
        - `offset = rangeStart - assetStart` (Skip beginning of clip)
      - `source.start(when, offset)`

  - **In `packages/player/src/features/exporter.ts`**:
    - In `export()`:
      - `state = controller.getState()`
      - If `state.playbackRange`:
        - `startFrame = state.playbackRange[0]`
        - `endFrame = state.playbackRange[1]`
        - `totalFrames = endFrame - startFrame`
      - Else:
        - `startFrame = 0`
        - `totalFrames = state.duration * state.fps`
      - Use `startFrame` for the initial frame capture (setup).
      - Update loop: `for (let i = 1; i < totalFrames; i++)` -> `frameIndex = startFrame + i`.
      - Capture `frameIndex`.
      - Audio: `mixAudio(..., totalFrames / fps, ..., startFrame / fps)`

- **Public API Changes**: None (Internal feature improvement).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `audio-utils.test.ts` passes with new test cases for `rangeStart`.
  - `exporter.test.ts` passes (ensure no regression).
- **Edge Cases**:
  - `playbackRange` is not set (should export full duration).
  - `playbackRange` starts at 0.
  - Audio clip starts before `rangeStart` (should be offset).
  - Audio clip starts after `rangeStart` (should be delayed).
  - Audio clip completely outside range (should handle gracefully, though `mixAudio` might just play silence or nothing).
