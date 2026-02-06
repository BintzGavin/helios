# Distributed Progress Aggregation

#### 1. Context & Goal
- **Objective**: Implement progress aggregation in `RenderOrchestrator` to provide a single, monotonic progress value during distributed rendering, replacing the current behavior where concurrent workers trigger the callback independently and erratically.
- **Trigger**: "Distributed Rendering" quality gap; current implementation causes `onProgress` to jump wildly (e.g., 0% -> 10% -> 5% -> 15%) as different workers report their local progress.
- **Impact**: Enables accurate progress bars in Studio and CLI, improving user experience for long renders.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-distributed-progress.ts`: Test script to verify monotonic progress reporting.
- **Modify**:
  - `packages/renderer/src/Orchestrator.ts`: Implement progress aggregation logic.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts`: Reference for `onProgress` contract.

#### 3. Implementation Spec
- **Architecture**: Use the **Aggregator Pattern**. The Orchestrator will intercept the `onProgress` callback meant for individual workers and compute a weighted global average based on the number of frames assigned to each worker.
- **Pseudo-Code**:
  ```typescript
  // In RenderOrchestrator.render
  const workerProgress = new Array(concurrency).fill(0);
  const totalJobFrames = totalFrames; // Total frames for the entire job

  // Helper to update global progress
  const updateGlobalProgress = () => {
    let completedFrames = 0;
    for (let i = 0; i < concurrency; i++) {
       // workerProgress[i] is 0..1
       // We know the frame count for each chunk
       const chunkFrames = getChunkFrames(i);
       completedFrames += workerProgress[i] * chunkFrames;
    }
    const globalProgress = completedFrames / totalJobFrames;
    if (originalOnProgress) originalOnProgress(globalProgress);
  }

  // Inside the loop for spawning workers:
  for (let i = 0; i < concurrency; i++) {
     const chunkFrames = ...;

     // Clone jobOptions and override onProgress
     const workerJobOptions = {
       ...jobOptions,
       onProgress: (p) => {
         workerProgress[i] = p;
         updateGlobalProgress();
       }
     };

     // Start renderer with workerJobOptions
     promises.push(new Renderer(chunkOptions).render(..., workerJobOptions));
  }
  ```
- **Public API Changes**: None. Internal logic improvement in `RenderOrchestrator`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-distributed-progress.ts`
- **Success Criteria**:
  - Run a distributed render with `concurrency: 2` (using a mock or simple composition).
  - Capture all `onProgress` events.
  - Assert that `progress` values strictly increase (or stay same), never decrease.
  - Assert that final progress reaches 1.0.
- **Edge Cases**:
  - `concurrency: 1`: Logic should still work (array of size 1).
  - Cancellation: Progress stops updating.
