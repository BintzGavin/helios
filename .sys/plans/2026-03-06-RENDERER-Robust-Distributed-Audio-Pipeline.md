# Plan: Robust Distributed Audio Pipeline

## 1. Context & Goal
- **Objective**: Eliminate audio artifacts (clicks/gaps) in distributed rendering by standardizing on uncompressed PCM intermediate chunks.
- **Trigger**: Concatenating lossy audio chunks (like AAC) causes "priming" artifacts at chunk boundaries. Implicit audio (DOM elements) rendered in chunks suffers from this, violating the "Professional Quality" vision.
- **Impact**: Ensures artifact-free audio in distributed renders, supporting both implicit (DOM) and explicit audio sources without glitches.

## 2. File Inventory
- **Modify**: `packages/renderer/src/Orchestrator.ts` (Implement PCM pipeline logic)
- **Read-Only**: `packages/renderer/src/Renderer.ts`, `packages/renderer/src/concat.ts`, `packages/renderer/src/utils/FFmpegBuilder.ts`

## 3. Implementation Spec
- **Architecture**:
  - **Phase 1 (Chunks)**: `RenderOrchestrator` will configure `Renderer` to output intermediate chunks using `.mov` container and `pcm_s16le` (uncompressed) audio codec.
  - **Phase 2 (Concat)**: Concatenate the PCM `.mov` chunks into a temporary master PCM `.mov` file using the existing `concatenateVideos` utility (stream copy).
  - **Phase 3 (Finalize)**: Always run a final FFmpeg pass to transcode the PCM master to the target output format (e.g., `.mp4` / `aac`) and mix in any explicit audio tracks.

- **Logic Flow (Orchestrator.ts)**:
  1.  Define `chunkAudioCodec = 'pcm_s16le'` and `chunkExtension = '.mov'`.
  2.  Update the chunk loop:
      - Set `chunkOptions.audioCodec = chunkAudioCodec`.
      - Construct `tempFile` path using `chunkExtension` (instead of `.mp4`).
  3.  Update `concatTarget`:
      - Always use a temporary file path with `chunkExtension` (e.g., `temp_concat_master.mov`).
  4.  Refactor the "Final Step" condition:
      - Change from `const finalStepNeeded = hasAudio;` to `const finalStepNeeded = true;`.
      - This forces the pipeline to always transcode the PCM intermediate to the final target format (AAC/MP4), even if no explicit audio mixing is needed.
  5.  In the final mix step (inside `finalStepNeeded` block):
      - Input is `concatTarget` (the PCM master).
      - Ensure `mixOptions` uses `videoCodec: 'copy'` (to preserve the rendered video).
      - Ensure `mixOptions` inherits the user's desired `audioCodec` (or default AAC) so `FFmpegBuilder` generates the correct transcoding args.
      - Explicit audio tracks (if any) are mixed here by `FFmpegBuilder`.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm run test packages/renderer/tests/verify-distributed.ts` (or equivalent command) to ensure the pipeline still functions correctly.
  - Inspect the output of the verification script to confirm success.
- **Success Criteria**:
  - The verification script completes without error.
  - The output video file is generated and valid.
  - Distributed rendering logic handles the `.mov` intermediates correctly.
- **Edge Cases**:
  - **Implicit Audio Only**: Should now go through the full Transcode step (PCM -> AAC).
  - **No Audio**: Should still work (Silent PCM -> Silent AAC).
  - **Explicit Audio**: Should still work (Silent PCM chunks -> Mixed with Explicit Audio).
