# 2026-09-12-RENDERER-Distributed-Progress-Aggregation.md

#### 1. Context & Goal
- **Objective**: Implement progress aggregation in `RenderOrchestrator` to normalize progress reports from concurrent workers into a single global progress value.
- **Trigger**: Currently, distributed rendering workers report progress independently (0-100%), causing `onProgress` to fire erratically with non-monotonic values (e.g., 0.1 -> 0.5 -> 0.2).
- **Impact**: Improves user experience in Studio and CLI by providing a smooth, accurate progress bar for distributed renders.

#### 2. File Inventory
- **Create**: `packages/renderer/tests/verify-distributed-progress.ts`
- **Modify**: `packages/renderer/src/Orchestrator.ts`
- **Read-Only**: `packages/renderer/src/Renderer.ts`

#### 3. Implementation Spec
- **Architecture**:
    - Use an aggregation closure within `RenderOrchestrator.render`.
    - Track individual progress of each worker in an array.
    - Calculate global weighted average based on the number of frames assigned to each worker.
- **Pseudo-Code**:
    ```typescript
    // Inside RenderOrchestrator.render
    const progressMap = new Array(concurrency).fill(0);
    const weights = new Array(concurrency).fill(0);
    const totalFrames = options.frameCount || Math.ceil(options.durationInSeconds * options.fps);

    // In the loop creating workers:
    for (let i = 0; i < concurrency; i++) {
        // ... calculation of count (frames for this worker) ...
        weights[i] = count / totalFrames;

        const workerJobOptions = {
            ...jobOptions,
            signal: internalController.signal,
            onProgress: (p: number) => {
                progressMap[i] = p;

                // Calculate global progress
                let globalProgress = 0;
                for (let j = 0; j < concurrency; j++) {
                    globalProgress += progressMap[j] * weights[j];
                }

                // Ensure monotonicity (optional, but good practice)
                // globalProgress = Math.max(lastReportedProgress, globalProgress);

                jobOptions?.onProgress?.(globalProgress);
            }
        };
        // ...
    }
    ```
- **Public API Changes**: None (internal behavior change only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-distributed-progress.ts`
- **Success Criteria**:
    - The mock test script should simulate 2 workers with different speeds.
    - It should assert that the global `onProgress` callback receives values that are strictly monotonic (never decrease).
    - It should verify that when all workers are done, progress is 1.0.
- **Edge Cases**:
    - One worker finishes much faster than others.
    - Uneven chunk sizes (e.g., total frames not divisible by concurrency).
    - `onProgress` not provided in options (should not crash).
