# 2026-03-07-RENDERER-Distributed-Implicit-Audio.md

## 1. Context & Goal
- **Objective**: Ensure implicit audio (DOM `<audio>`/`<video>`) preserved in distributed rendering chunks is included in the final output mix.
- **Trigger**: Distributed rendering drops implicit audio during the final mix step because `FFmpegBuilder` ignores the input video's audio stream (`0:a`) when explicit audio tracks are present.
- **Impact**: Enables fully correct distributed rendering for compositions that use both implicit DOM audio and explicit background tracks.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `mixInputAudio` option)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Implement `mixInputAudio` logic)
- **Modify**: `packages/renderer/src/Orchestrator.ts` (Enable `mixInputAudio` in final mix step)
- **Create**: `tests/verify-ffmpeg-builder.ts` (Unit test for FFmpegBuilder argument generation)

## 3. Implementation Spec

### Architecture
- **Strategy Pattern**: Enhance `FFmpegBuilder` to optionally treat the input video (stream `0:a`) as a mixable audio source.
- **Configuration**: Expose `mixInputAudio` in `RendererOptions` to allow explicit control over this behavior.

### Pseudo-Code

**types.ts**:
```typescript
interface RendererOptions {
  // ... existing options
  /**
   * Whether to include the input video's audio stream (0:a) in the final mix.
   * Useful when post-processing a video that already contains audio.
   */
  mixInputAudio?: boolean;
}
```

**FFmpegBuilder.ts**:
- In `getArgs`:
  - Check `options.mixInputAudio`.
  - If `true`:
    - Identify input 0 audio as `[0:a]`.
    - If `tracks` exist:
      - Add `[0:a]` to the inputs of the `amix` filter.
      - Increment `inputs` count for `amix`.
      - Prepend `[0:a]` to the filter chain string: `[0:a][a0][a1]...amix...`.
    - If `tracks` do NOT exist:
      - Set `audioMap` to `'0:a'` (ensure input audio is passed through).

**Orchestrator.ts**:
- In the final mixing step (after concatenation):
  - Set `mixInputAudio: true` in `mixOptions`.

### Public API Changes
- `RendererOptions` gains optional `mixInputAudio` property.

### Dependencies
- None.

## 4. Test Plan
- **Verification**: Run `npx ts-node tests/verify-ffmpeg-builder.ts`
- **Success Criteria**:
  - The script asserts that generated FFmpeg arguments contain `[0:a]` in the `filter_complex` string when `mixInputAudio` is true.
  - Verifies correct behavior for both "tracks + input audio" (mixing) and "no tracks + input audio" (passthrough) cases.
- **Edge Cases**:
  - `mixInputAudio: true` with no audio tracks -> Should map `0:a`.
  - `mixInputAudio: false` (default) -> Should behave as before (ignore `0:a` if tracks exist).
