# 2026-02-19-RENDERER-Distributed-Audio-Mixing

#### 1. Context & Goal
- **Objective**: Decouple audio mixing from distributed video rendering chunks to prevent audio glitches and improve performance.
- **Trigger**: Distributed rendering currently mixes audio into every chunk, causing clicks/pops at concatenation boundaries due to codec frame alignment mismatches (e.g. AAC priming samples).
- **Impact**: Enables high-quality, gapless audio in distributed renders and speeds up chunk rendering by removing redundant audio processing.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/Orchestrator.ts` (Implement silent chunks and post-mix logic)
- **Modify**: `packages/renderer/tests/verify-distributed.ts` (Add audio verification)
- **Read-Only**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Use for mixing args)
- **Read-Only**: `packages/renderer/src/concat.ts` (Use for concat)

#### 3. Implementation Spec
- **Architecture**:
  - Update `RenderOrchestrator.render`:
    - CHECK if `options.audioTracks` or `options.audioFilePath` is present.
    - IF present:
      - CLONE `options` to `silentOptions` and REMOVE audio properties (`audioTracks`, `audioFilePath`).
      - RENDER chunks using `silentOptions` (produces silent video chunks).
      - CONCATENATE silent chunks to a `tempConcatFile` (intermediate silent video).
      - CALCULATE mixing args using `FFmpegBuilder.getArgs`:
        - Input: `tempConcatFile` (passed as `videoInputArgs` e.g., `['-i', tempConcatFile]`)
        - Audio: Original `options.audioTracks` / `audioFilePath`
        - Video Codec: `'copy'` (to stream-copy the rendered video without re-encoding)
        - Output: Final `outputPath`
      - SPAWN FFmpeg to mix audio.
      - CLEANUP `tempConcatFile`.
    - ELSE:
      - PROCEED with existing logic (render chunks with original options, concat directly to final output).

- **Pseudo-Code**:
  ```typescript
  // In RenderOrchestrator.ts

  static async render(compositionUrl, outputPath, options, jobOptions) {
    const hasAudio = (options.audioTracks && options.audioTracks.length > 0) || !!options.audioFilePath;
    const finalStepNeeded = hasAudio;

    // Determine target for concatenation
    // If mixing needed, concat to temp file. Else concat to final output.
    // Use path.join(path.dirname(outputPath), tempName) to ensure same volume
    const concatTarget = finalStepNeeded
      ? path.join(path.dirname(outputPath), `temp_concat_${Date.now()}.mp4`)
      : outputPath;

    // Prepare options for chunks
    // Strip audio to ensure silent rendering
    const chunkBaseOptions = finalStepNeeded
      ? { ...options, audioTracks: [], audioFilePath: undefined }
      : options;

    // ... Standard Render Loop (using chunkBaseOptions) ...
    // ... Concatenate to concatTarget ...

    if (finalStepNeeded) {
       console.log('Mixing audio into concatenated video...');

       // Use FFmpegBuilder to generate args for the mixing pass
       // We force 'copy' for video to avoid re-encoding
       const mixOptions = { ...options, videoCodec: 'copy' };
       const videoInputArgs = ['-i', concatTarget];

       // FFmpegBuilder handles audio offsets/seeking based on options
       const { args } = FFmpegBuilder.getArgs(mixOptions, outputPath, videoInputArgs);

       // Spawn FFmpeg
       const ffmpegPath = options.ffmpegPath || ffmpeg.path;
       const proc = spawn(ffmpegPath, args);
       // Handle proc stdout/stderr/close/error...
       // Await completion

       // Cleanup intermediate silent video
       await fs.promises.unlink(concatTarget);
    }
  }
  ```

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-distributed.ts`
- **Success Criteria**:
  - Distributed render completes successfully with audio inputs.
  - Final output exists and size implies audio presence (vs silent).
  - Intermediate `temp_concat` file is cleaned up.
  - No FFmpeg errors during the mix step.
- **Edge Cases**:
  - `startFrame` > 0: `FFmpegBuilder` should handle audio sync correctly.
  - `videoCodec: 'copy'`: Logic should handle it naturally (copy -> copy).
