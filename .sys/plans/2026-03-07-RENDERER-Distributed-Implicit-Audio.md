# Plan: Enable Implicit Audio in Distributed Rendering

## 1. Context & Goal
- **Objective**: Ensure that implicit audio (from DOM `<audio>`/`<video>` elements) captured in distributed rendering chunks is preserved and mixed in the final output.
- **Trigger**: Currently, the `RenderOrchestrator` drops the audio stream from the concatenated intermediate file during the final mix step because `FFmpegBuilder` defaults to ignoring input audio (`0:a`) when generating mix arguments.
- **Impact**: Unlocks correct audio rendering for distributed jobs where the audio comes from the DOM (implicit) rather than explicit `audioTracks`. Without this, such jobs result in silent video.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `mixInputAudio` option)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Implement logic to mix `0:a` if requested)
- **Modify**: `packages/renderer/src/Orchestrator.ts` (Enable `mixInputAudio` in final step)
- **Create**: `packages/renderer/tests/verify-distributed-implicit-audio.ts` (Verification script)

## 3. Implementation Spec
- **Architecture**: Explicit Configuration. The `Orchestrator` knows the input file contains valid audio that must be kept, so it explicitly instructs `FFmpegBuilder` via `mixInputAudio: true`.
- **Public API Changes**:
  - `RendererOptions` gets a new optional property `mixInputAudio?: boolean`.
- **Pseudo-Code**:
  - **FFmpegBuilder.ts**:
    - In `getArgs`:
    - Initialize `sources` array.
    - If `options.mixInputAudio` is true, add `[0:a]` to `sources`.
    - Add explicit tracks (already processed into `[a0]`, `[a1]`, etc.) to `sources`.
    - If `sources` has items:
      - If singular and source is `[0:a]`:
        - Set `audioMap = '0:a'`.
        - `audioFilterGraph` is empty (unless we add filters to input audio later, but for now raw is fine).
      - If singular and source is `[a0]`:
        - Use existing single-track logic (map `[a0]`, graph = chain).
      - If multiple (mix needed):
        - Construct `amix` filter with all `sources`.
        - `audioFilterGraph` = (track chains joined) + `;` + (sources joined) + `amix=inputs=${sources.length}:duration=longest[aout]`.
        - `audioMap = '[aout]'`.
  - **Orchestrator.ts**:
    - In `render` method, when defining `mixOptions`:
      - Set `mixInputAudio: true`.

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-distributed-implicit-audio.ts`.
- **Success Criteria**:
  - The script renders a distributed job (e.g. 2 chunks) of a composition with implicit audio (e.g. a simple sine wave or local audio file).
  - The output file contains an audio stream.
  - `ffprobe` confirms audio duration matches video duration.
- **Edge Cases**:
  - **Explicit + Implicit**: Verify that `audioTracks` are mixed with the implicit audio.
  - **No Implicit**: If `mixInputAudio: true` is set but input has no audio stream, FFmpeg might fail. `Orchestrator` ensures input is `.mov` with PCM, so it always has a stream (even if silent).
