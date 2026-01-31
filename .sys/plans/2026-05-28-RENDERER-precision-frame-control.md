# Context & Goal
- **Objective**: Add `frameCount` to `RendererOptions` to allow exact control over the number of frames rendered, superseding `durationInSeconds` for defining render length.
- **Trigger**: "V2: Distributed Rendering" requires splitting video into precise frame-range chunks (e.g., frames 0-100, 101-200). Relying on `durationInSeconds` introduces floating-point precision errors (e.g. `3.333s` at 30fps might be 99 or 101 frames).
- **Impact**: Enables gapless concatenation of distributed render chunks by ensuring each chunk has the exact expected frame count.

# File Inventory
- **Modify**: `packages/renderer/src/types.ts`
  - Add `frameCount?: number` to `RendererOptions`.
- **Modify**: `packages/renderer/src/Renderer.ts`
  - Prioritize `frameCount` for `totalFrames` calculation in the capture loop.
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts`
  - Prioritize `frameCount / fps` for `-t` (duration) calculation in FFmpeg arguments.
- **Create**: `packages/renderer/tests/verify-frame-count.ts`
  - A verification script to confirm loop count matches `frameCount`.

# Implementation Spec
- **Architecture**:
  - `RendererOptions` gains optional `frameCount`.
  - `Renderer` logic checks `options.frameCount`.
    - If present, `totalFrames = options.frameCount`.
    - If absent, `totalFrames = options.durationInSeconds * options.fps`.
  - `FFmpegBuilder` logic checks `options.frameCount`.
    - If present, output duration (`-t`) is `frameCount / fps`.
    - If absent, output duration is `durationInSeconds`.
  - `durationInSeconds` remains mandatory (for backward compatibility) but is ignored for loop limits if `frameCount` is set.

- **Pseudo-Code (Renderer.ts)**:
  ```typescript
  // Inside render()
  CALCULATE totalFrames:
    IF options.frameCount IS defined:
      SET totalFrames = options.frameCount
    ELSE:
      SET totalFrames = options.durationInSeconds * options.fps
  ```

- **Pseudo-Code (FFmpegBuilder.ts)**:
  ```typescript
  // Inside getArgs()
  CALCULATE audioDuration:
    IF options.frameCount IS defined:
      SET audioDuration = options.frameCount / options.fps
    ELSE:
      SET audioDuration = options.durationInSeconds
  ADD "-t" audioDuration to args
  ```

# Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-frame-count.ts`
- **Success Criteria**:
  - Render a job with `fps: 30`, `frameCount: 100`, `durationInSeconds: 1` (conflicting).
  - Verify that exactly 100 frames are captured (by mocking `capture` or inspecting logs).
  - Verify that FFmpeg args include `-t 3.3333...`.
- **Edge Cases**:
  - `frameCount` undefined (should fallback to `durationInSeconds` * `fps`).
  - `frameCount: 0` (should handle gracefully or render 0 frames).
