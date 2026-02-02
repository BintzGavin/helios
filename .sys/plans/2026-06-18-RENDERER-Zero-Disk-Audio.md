# 2026-06-18-RENDERER-Zero-Disk-Audio.md

## 1. Context & Goal
- **Objective**: Implement true "Zero Disk I/O" for audio tracks sourced from Blobs by piping them directly to FFmpeg instead of writing temporary files.
- **Trigger**: The current implementation of `blob-extractor` writes files to disk (`fs.writeFileSync`), violating the core architectural principle of "Zero Disk I/O".
- **Impact**: Enables a pure in-memory pipeline for dynamic audio (e.g., TTS), reducing disk wear and IO latency, and aligning with the documented vision.

## 2. File Inventory
- **Modify**:
  - `packages/renderer/src/utils/blob-extractor.ts`: Refactor to return buffers instead of file paths.
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Update to support piped inputs (`pipe:N`) and buffer mapping.
  - `packages/renderer/src/strategies/RenderStrategy.ts`: Update `getFFmpegArgs` return signature to include pipe configuration.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Adapt to new `blob-extractor` and `FFmpegBuilder`.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Adapt to new `blob-extractor` and `FFmpegBuilder`.
  - `packages/renderer/src/index.ts`: Update FFmpeg spawning logic to open extra pipes and write audio buffers.

## 3. Implementation Spec

### Architecture
- **Piped Inputs**: Use FFmpeg's `pipe:N` syntax to feed audio data.
- **Internal Type**: Define `InternalAudioTrack` extending `AudioTrackConfig` with `buffer?: Buffer`.
- **Pipe Management**: The `Renderer` will open stdio pipes corresponding to the audio inputs and stream the buffers.

### Detailed Steps

1.  **Refactor `blob-extractor.ts`**:
    - Remove `fs` usage.
    - Change `extractBlobTracks` to return `tracks` where blob tracks have `buffer` populated and `path` set to a placeholder.
    - Remove `cleanup` function (no files to clean).

2.  **Update `FFmpegBuilder.ts`**:
    - Update `getArgs` to accept `tracks` that might have `buffer`.
    - Maintain a counter for pipes (starting at 3, as 0-2 are reserved).
    - For tracks with `buffer`:
        - Set input path to `pipe:${pipeIndex}`.
        - Add buffer to a `pipedInputs` array: `{ index: pipeIndex, buffer: buffer }`.
        - Increment pipe index.
    - Return `{ args: string[], pipedInputs: { index: number, buffer: Buffer }[] }`.

3.  **Update `RenderStrategy` Interface**:
    - Change `getFFmpegArgs` return type from `string[]` to `{ args: string[], pipedInputs?: { index: number, buffer: Buffer }[] }`.

4.  **Update Strategies (`CanvasStrategy`, `DomStrategy`)**:
    - Update `prepare` to store the buffered tracks from `extractBlobTracks`.
    - Update `getFFmpegArgs` to call the updated `FFmpegBuilder` and return the new object structure.
    - Remove `cleanup` logic related to audio files.

5.  **Update `index.ts` (Renderer)**:
    - In `render()`:
        - Call `strategy.getFFmpegArgs`.
        - Construct `stdio` array for `spawn` ensuring it's large enough for the highest pipe index.
        - Spawn FFmpeg.
        - Iterate over `pipedInputs` and write buffers to `ffmpegProcess.stdio[index]`.
        - Handle error events on these streams.
        - Close the pipe streams after writing.

## 4. Test Plan
- **Verification**:
    1. Run `npx tsx packages/renderer/tests/verify-blob-audio.ts` to verify the specific feature.
    2. Run `npm test -w packages/renderer` (which executes `run-all.ts`) to ensure no regressions in other rendering paths.
- **Success Criteria**:
    - The `verify-blob-audio` test passes and reports no temporary files found.
    - All existing tests in `run-all.ts` pass.
- **Edge Cases**:
    - Multiple blob tracks (multiple pipes).
    - Mixed file and blob tracks.
