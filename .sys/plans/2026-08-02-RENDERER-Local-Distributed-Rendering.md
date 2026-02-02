#### 1. Context & Goal
- **Objective**: Implement the `RenderOrchestrator` to enable local distributed rendering by splitting a job into multiple concurrent chunks and concatenating the results.
- **Trigger**: Vision Gap - "V2: Distributed Rendering" is a key architectural pillar. We have the primitives (Range Rendering, Concatenation) but lack the orchestrator to tie them together.
- **Impact**: Unlocks multi-core rendering performance on a single machine and validates the architecture for future cloud-based distributed rendering.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/src/Orchestrator.ts`: Implementation of the splitting and coordination logic.
  - `packages/renderer/tests/verify-distributed.ts`: Verification script.
- **Modify**:
  - `packages/renderer/src/index.ts`: Export the `RenderOrchestrator`.
- **Read-Only**:
  - `packages/renderer/src/index.ts`: Contains the `Renderer` class definition.
  - `packages/renderer/src/concat.ts`: Contains `concatenateVideos` utility.

#### 3. Implementation Spec
- **Architecture**:
  - `RenderOrchestrator` class with a static `render` method (or instance based).
  - Accepts `concurrency` option (default: 1, or CPU count - 1).
  - Calculates frame ranges: `ChunkSize = TotalFrames / Concurrency`.
  - Spawns `N` `Renderer` instances (using the `Renderer` class from `index.ts`), each targeting a temporary output file (`output_part_X.mp4`).
  - Uses `Promise.all` to run renders in parallel.
  - Upon completion of all chunks, calls `concatenateVideos` to merge parts into final `outputPath`.
  - Cleans up temporary files.
- **Pseudo-Code**:
  ```typescript
  export class RenderOrchestrator {
    static async render(options: DistributedRenderOptions) {
      const totalFrames = options.frameCount || (options.duration * options.fps);
      const concurrency = options.concurrency || 1;
      const chunkSize = Math.ceil(totalFrames / concurrency);
      const tempFiles = [];
      const promises = [];

      for (let i = 0; i < concurrency; i++) {
        const start = i * chunkSize;
        const count = Math.min(chunkSize, totalFrames - start);
        if (count <= 0) break;

        const tempFile = `temp_${i}.mp4`;
        tempFiles.push(tempFile);

        const renderer = new Renderer({ ...options, startFrame: start, frameCount: count });
        promises.push(renderer.render(options.composition, tempFile));
      }

      await Promise.all(promises);
      await concatenateVideos(tempFiles, options.outputPath);
      // Cleanup tempFiles
    }
  }
  ```
- **Public API Changes**:
  - Export `RenderOrchestrator` from `index.ts`.
  - New interface `DistributedRenderOptions extends RendererOptions { concurrency?: number }`.
- **Dependencies**:
  - `Renderer` (supports `startFrame`, `frameCount`).
  - `concatenateVideos` (supports `concat` demuxer).

#### 4. Test Plan
- **Verification**:
  - Run `npx tsx packages/renderer/tests/verify-distributed.ts`.
- **Success Criteria**:
  - The script renders a test composition (e.g., 60 frames) using 2 workers.
  - Output file exists and plays correctly.
  - Logs confirm parallel execution (e.g., "Starting worker 1", "Starting worker 2").
  - Intermediate chunk files are deleted.
- **Edge Cases**:
  - `concurrency` = 1 (should behave like normal render).
  - `concurrency` > `totalFrames` (should handle gracefully, maybe clamp).
  - Error in one worker (should abort all? or fail fast).
  - Cleanup on failure.
