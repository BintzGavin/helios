# 2026-11-01-INFRASTRUCTURE-Retry-Logic.md

## 1. Context & Goal
- **Objective**: Implement robust retry logic in `JobExecutor` to handle transient failures in distributed rendering jobs.
- **Trigger**: Cloud execution environments (AWS Lambda, Cloud Run) are prone to transient failures (timeouts, network issues, cold starts). The current "fail-fast" behavior aborts the entire job on a single chunk failure.
- **Impact**: Increases reliability of distributed rendering. A single failed chunk will no longer crash the entire job, allowing it to recover automatically.

## 2. File Inventory
- **Modify**: `packages/infrastructure/src/orchestrator/job-executor.ts`
  - Update `JobExecutionOptions` interface.
  - Implement retry loop in the worker processing logic.
- **Modify**: `packages/infrastructure/tests/job-executor.test.ts`
  - Add tests for retry behavior (success after retry, failure after max retries).

## 3. Implementation Spec
- **Architecture**:
  - Extend `JobExecutionOptions` with `retries` (default 0) and `retryDelay` (default 1000ms).
  - Inside the `worker` function in `JobExecutor`, wrap the chunk execution logic in a retry loop.
  - The loop should catch both exceptions (e.g., network errors from adapter) and non-zero exit codes (application errors).
  - On failure, if attempts remain, wait for `retryDelay` (with optional exponential backoff if simple to implement, but constant is fine for V1) and retry.
  - Log warnings when a retry occurs: `[Worker X] Chunk Y failed (Attempt 1/3). Retrying in 1000ms...`
  - If all retries fail, propagate the error to stop the job (or handle per existing logic).

- **Pseudo-Code**:
```typescript
interface JobExecutionOptions {
  // ... existing
  retries?: number; // Default 0
  retryDelay?: number; // Default 1000ms
}

// Inside worker loop
const maxRetries = options.retries || 0;
const retryDelay = options.retryDelay || 1000;

// ... inside while(true) queue processing loop
let attempt = 0;
while (true) {
  try {
    // execute adapter
    const result = await this.adapter.execute({ ... });

    if (result.exitCode !== 0) {
       throw new Error(`Chunk ${chunk.id} failed with exit code ${result.exitCode}: ${result.stderr}`);
    }

    // Success
    break;
  } catch (error) {
    if (attempt < maxRetries) {
      attempt++;
      console.warn(`[Worker ${workerId}] Chunk ${chunk.id} failed (Attempt ${attempt}/${maxRetries}). Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      continue;
    }
    // Final failure
    throw error;
  }
}
```

- **Dependencies**: None.
- **Cloud Considerations**: This is cloud-agnostic but highly beneficial for the cloud adapters.

## 4. Test Plan
- **Verification**: Run unit tests in `packages/infrastructure`.
  - `cd packages/infrastructure && npx vitest run tests/job-executor.test.ts`
- **Success Criteria**:
  - New test "should retry failed chunks" passes.
  - New test "should fail after exhausting retries" passes.
  - Existing tests pass.
