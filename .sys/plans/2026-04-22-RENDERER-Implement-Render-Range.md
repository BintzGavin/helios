# 📋 RENDERER: Implement Render Range Support

#### 1. Context & Goal
- **Objective**: Implement `frameCount` support in `RendererOptions` to enable rendering specific frame ranges (chunks) independent of the total composition duration.
- **Trigger**: "V2: Distributed Rendering" requires splitting renders into parallel chunks (e.g., frames 0-100, 101-200).
- **Impact**: Enables the "Orchestrator" pattern where `startFrame` and `frameCount` define a job, while `durationInSeconds` maintains the correct composition context.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `frameCount` to interface)
- **Modify**: `packages/renderer/src/Renderer.ts` (Update loop limit logic)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Update `-t` duration calculation)
- **Create**: `packages/renderer/tests/verify-render-range.ts` (Verification script)

#### 3. Implementation Spec
- **Architecture**: Decouple "Render Duration" from "Composition Duration".
  - `durationInSeconds`: Total length of the video composition (used by the composition logic).
  - `frameCount`: Number of frames to render in this specific job (defaults to full duration if omitted).
- **Pseudo-Code**:
  - `Renderer.ts`: `const totalFrames = options.frameCount ?? (options.durationInSeconds * options.fps);`
  - `FFmpegBuilder.ts`: `const outputDuration = options.frameCount ? options.frameCount / options.fps : options.durationInSeconds;`
- **Public API Changes**: `RendererOptions` gains optional `frameCount: number`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-render-range.ts`
- **Success Criteria**:
  - Script initializes `Renderer` with `duration: 10` (300 frames) and `frameCount: 30` (1s).
  - Logs confirm rendering 30 frames.
  - FFmpeg process exits successfully.
  - Output file is created.
- **Edge Cases**:
  - `frameCount` undefined (should render full duration).
  - `frameCount` > `duration` (should render up to frameCount).
