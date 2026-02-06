# Orchestrator Cancellation

#### 1. Context & Goal
- **Objective**: Implement robust cancellation in `RenderOrchestrator` to ensure that if any distributed rendering worker fails, all other concurrent workers are immediately cancelled.
- **Trigger**: "Distributed Rendering" quality gap; currently, if one worker fails (e.g. throws an error), `Promise.all` rejects, but other workers continue running until they finish, causing resource waste and potential zombie processes.
- **Impact**: Improves resource usage and responsiveness, especially in long-running environments like Studio.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-distributed-cancellation.ts`: Test script to verify that a failure in one worker aborts others.
- **Modify**:
  - `packages/renderer/src/Orchestrator.ts`: Implement `AbortController` logic to wrap worker promises.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts`: Reference for `signal` handling.

#### 3. Implementation Spec
- **Architecture**:
  - `RenderOrchestrator.render` will create an internal `AbortController`.
  - This controller's signal will be passed to all `Renderer` instances (merged with user signal if present).
  - The loop spawning workers will attach a `.catch()` handler to each worker promise that triggers `controller.abort()`.
  - `Promise.all` will still be used to await completion/failure, but the early abort will ensure rapid teardown.
- **Pseudo-Code**:
  ```typescript
  // In RenderOrchestrator.render
  const internalController = new AbortController();

  // If user provided a signal, link it
  if (jobOptions?.signal) {
    if (jobOptions.signal.aborted) {
       internalController.abort();
    } else {
       jobOptions.signal.addEventListener('abort', () => internalController.abort());
    }
  }

  // Create job options for workers
  const workerJobOptions = {
    ...jobOptions,
    signal: internalController.signal
  };

  const promises = [];
  for (let i = 0; i < concurrency; i++) {
     // ... logic to prepare chunks ...
     const promise = renderer.render(..., workerJobOptions)
        .catch(err => {
            // Abort all other workers on any error
            // (Unless it was already aborted)
            if (!internalController.signal.aborted) {
                console.log('Worker failed, aborting others...');
                internalController.abort();
            }
            throw err;
        });
     promises.push(promise);
  }

  try {
     await Promise.all(promises);
     // ... concatenation logic ...
  } finally {
     // Ensure controller is cleaned up if needed
  }
  ```
- **Public API Changes**: None. Internal behavior improvement.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-distributed-cancellation.ts`
- **Success Criteria**:
  - Run a distributed render with 2 workers.
  - Worker 1 is configured to fail fast (or mock it).
  - Worker 2 is configured to run long.
  - Assert that Worker 2 stops (aborted) shortly after Worker 1 fails.
  - Assert that the overall promise rejects with the original error.
- **Edge Cases**:
  - User aborts via `jobOptions.signal` -> All workers stop.
  - Multiple workers fail simultaneously -> First error propagates, all aborted.
