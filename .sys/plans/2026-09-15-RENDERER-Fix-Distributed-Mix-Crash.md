# 2026-09-15-RENDERER-Fix-Distributed-Mix-Crash.md

#### 1. Context & Goal
- **Objective**: Prevent `RenderOrchestrator` from passing `mixInputAudio: true` to worker chunks, which causes FFmpeg crashes.
- **Trigger**: The `mixInputAudio` option, if set to `true` in `DistributedRenderOptions`, is currently inherited by worker chunks. Since chunks use piped video input (stream 0:v) which has no audio stream (0:a), `FFmpegBuilder` generates invalid arguments (`[0:a]`) causing the render to fail.
- **Impact**: Ensures distributed rendering is robust and doesn't crash if the user inadvertently enables `mixInputAudio` (or if it's set by default in the future). This option is only valid for the final mix step (where input 0 is a file), not for intermediate chunks.

#### 2. File Inventory
- **Create**: `packages/renderer/tests/verify-orchestrator-mix-input.ts`
- **Modify**: `packages/renderer/src/Orchestrator.ts`
- **Read-Only**: `packages/renderer/src/Renderer.ts`, `packages/renderer/src/utils/FFmpegBuilder.ts`

#### 3. Implementation Spec
- **Architecture**: Update the `RenderOrchestrator.plan` method to explicitly disable `mixInputAudio` in the `chunkBaseOptions`.
- **Pseudo-Code**:
  ```typescript
  // In RenderOrchestrator.ts -> plan()
  const chunkBaseOptions: RendererOptions = {
    ...options,
    audioTracks: [],
    audioFilePath: undefined,
    audioCodec: CHUNK_AUDIO_CODEC,
    mixInputAudio: false // <--- Explicitly disable for chunks
  };
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-orchestrator-mix-input.ts`
- **Success Criteria**:
  1. The test calls `RenderOrchestrator.plan` with `mixInputAudio: true`.
  2. It asserts that `plan.chunks[0].options.mixInputAudio` is strictly `false`.
  3. It asserts that `plan.mixOptions.mixInputAudio` remains `true` (or conditional based on implementation).
- **Edge Cases**: Verify with `mixInputAudio: false` and `undefined` to ensure no regression (chunks should always be false).
