# 2026-09-13-RENDERER-Orchestrator-Plan.md

## 1. Context & Goal
- **Objective**: Refactor `RenderOrchestrator` to decouple job planning from execution by introducing a `plan()` method and `RenderPlan` interface.
- **Trigger**: The orchestration logic (chunk splitting, audio settings, file paths) is currently tightly coupled with execution in `RenderOrchestrator.render`, leading to duplication in the CLI (`emit-job`) and preventing external runners from easily consuming the job logic.
- **Impact**: Enables the CLI to reuse the Renderer's planning logic, ensures consistency between local and distributed renders, and paves the way for a cleaner distributed rendering architecture where "Planning" and "Execution" are distinct steps.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `RenderPlan` and `RenderChunk` interfaces)
- **Modify**: `packages/renderer/src/Orchestrator.ts` (Implement `plan()` and refactor `render()` to use it)
- **Create**: `packages/renderer/tests/verify-orchestrator-plan.ts` (New test to verify the planning logic output)

## 3. Implementation Spec
- **Architecture**: Move the "Job Planning" logic (calculating chunks, generating temp file paths, configuring audio mix options) into a pure(ish) `plan()` method. `render()` becomes a consumer of this plan.
- **Public API Changes**:
  - `RenderOrchestrator.plan(compositionUrl: string, outputPath: string, options: DistributedRenderOptions): RenderPlan`
  - New interfaces in `types.ts`:
    ```typescript
    export interface RenderChunk {
      id: number;
      startFrame: number;
      frameCount: number;
      outputFile: string;
      options: RendererOptions;
    }

    export interface RenderPlan {
      totalFrames: number;
      chunks: RenderChunk[];
      concatManifest: string[]; // List of chunk files to concatenate
      concatOutputFile: string; // The intermediate PCM .mov file
      finalOutputFile: string; // The final user-requested output
      mixOptions: RendererOptions; // Options for the final audio mix/transcode pass
      cleanupFiles: string[]; // List of temporary files to delete after success
    }
    ```
- **Pseudo-Code**:
  - `plan(url, output, options)`:
    - Validate inputs (concurrency, frames).
    - Calculate total frames and chunk sizes.
    - Generate temp file paths (using `output` directory).
    - Configure `chunkBaseOptions` (force `pcm_s16le`, remove audio tracks).
    - Loop `concurrency` times:
      - Create `RenderChunk` with specific frame range and options.
    - Configure `mixOptions` (force `copy` video, enable `mixInputAudio`).
    - Return `RenderPlan`.
  - `render(url, output, options)`:
    - Call `const plan = this.plan(url, output, options)`.
    - Ensure output directory exists.
    - Execute chunks in parallel using `executor.render(url, chunk.outputFile, chunk.options)`.
    - Handle cancellation and progress aggregation (existing logic).
    - Concatenate `plan.concatManifest` to `plan.concatOutputFile`.
    - Run final mix using `plan.mixOptions` (if needed).
    - Cleanup `plan.cleanupFiles`.

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-orchestrator-plan.ts`.
- **Success Criteria**: The test should call `RenderOrchestrator.plan()` and assert that:
  - It returns the correct number of chunks.
  - Chunk options have `audioCodec: 'pcm_s16le'`.
  - Frame ranges are contiguous and cover the total duration.
  - Mix options have `mixInputAudio: true` (if applicable).
- **Regression**: Run `npx tsx packages/renderer/tests/verify-distributed.ts` to ensure the refactored `render()` still works end-to-end.
