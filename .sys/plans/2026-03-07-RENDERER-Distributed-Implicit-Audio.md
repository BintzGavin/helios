# Plan: Distributed Implicit Audio

## 1. Context & Goal
- **Objective**: Ensure implicit audio (DOM `<audio>` elements) is preserved during the final mix step of distributed rendering.
- **Trigger**: The current `FFmpegBuilder` implementation defaults to ignoring the input video's audio stream (`0:a`) when performing audio mixing, causing distributed renders (which rely on concatenating chunks with implicit audio) to be silent unless explicit audio tracks are provided.
- **Impact**: Enables correct distributed rendering for compositions using DOM-based audio (e.g., `<audio>` tags), aligning with the "Use What You Know" principle.
- **Dependencies**: None.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (add `mixInputAudio` to `RendererOptions`)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (implement logic to map `0:a` when `mixInputAudio` is true)
- **Modify**: `packages/renderer/src/Orchestrator.ts` (enable `mixInputAudio: true` for the final mixing pass)

## 3. Implementation Spec
- **Architecture**:
  - Update `RendererOptions` to include `mixInputAudio?: boolean`.
  - In `FFmpegBuilder.getArgs`:
    - Check if `mixInputAudio` is true.
    - If true, treat `0:a` as an audio input source.
    - If `tracks.length > 0`, include `[0:a]` in the `amix` filter graph (increasing inputs count by 1).
    - If `tracks.length === 0`, ensure `0:a` is mapped directly to the output (`-map 0:a`).
  - In `Orchestrator.render`:
    - Set `mixInputAudio: true` in the `mixOptions` used for the final ffmpeg pass.

- **Pseudo-Code (FFmpegBuilder)**:
  ```typescript
  // Inside getArgs...
  let audioFilterGraph = '';
  let audioMap = '';
  // Check if we should mix input audio (only if input video exists, which is standard)
  const shouldMixInput = options.mixInputAudio === true;

  if (tracks.length > 0 || shouldMixInput) {
    if (tracks.length === 0 && shouldMixInput) {
      // No extra tracks, just pass through input audio
      // We assume input 0 is the video file which contains the audio stream
      audioMap = '0:a';
    } else {
      // Mixing required
      let graph = audioFilterChains.join(';');
      let mixInputs = tracks.map((_, i) => `[a${i}]`).join('');
      let inputCount = tracks.length;

      if (shouldMixInput) {
        // Prepend 0:a to the mix inputs
        mixInputs = `[0:a]${mixInputs}`;
        inputCount++;
      }

      graph += `;${mixInputs}amix=inputs=${inputCount}:duration=longest[aout]`;
      audioFilterGraph = graph;
      audioMap = '[aout]';
    }
  }
  ```

- **Public API Changes**:
  - `RendererOptions` interface gains `mixInputAudio?: boolean`.

## 4. Test Plan
- **Verification**:
  - Create a new test script `tests/verify-distributed-audio.ts` that:
    - Uses a simple DOM composition with an `<audio>` element (using a data URI or local file).
    - Runs a distributed render (concurrency > 1).
    - Uses `ffprobe` (via `FFmpegInspector` or `spawn`) to verify the output file has an audio stream.
  - Run `npm run test` to ensure no regressions.
- **Success Criteria**: The output video from distributed rendering contains an audio stream with non-zero duration.
