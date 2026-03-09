#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `createAwsHandler` utility.
- **Trigger**: The domain is fully aligned with V2 AGENTS.md requirements, and adding performance benchmarks is an allowed fallback action. Benchmarks exist for cloud adapters and `createCloudRunServer`, but `aws-handler.ts` lacks benchmark coverage.
- **Impact**: Quantifies the overhead of the AWS Lambda handler invocation and `WorkerRuntime` execution, ensuring it remains performant for distributed cloud rendering.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/aws-handler.bench.ts`
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/worker/aws-handler.ts`
  - `packages/infrastructure/src/worker/runtime.ts`

#### 3. Implementation Spec
- **Architecture**: The benchmark will use `vitest bench` to measure the execution time of the AWS Lambda handler returned by `createAwsHandler`. It will mock `WorkerRuntime.prototype.run` to simulate job execution without actual rendering, isolating the handler's overhead.
- **Pseudo-Code**:
  ```typescript
  import { describe, bench, beforeAll, vi } from 'vitest';
  import { createAwsHandler } from '../../src/worker/aws-handler.js';
  import { WorkerRuntime } from '../../src/worker/runtime.js';

  vi.mock('../../src/worker/runtime.js');

  describe('AwsHandler Benchmark', () => {
    const handler = createAwsHandler({ workspaceDir: '/tmp' });

    beforeAll(() => {
      vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
        exitCode: 0,
        stdout: 'Mock output',
        stderr: '',
        durationMs: 10
      });
    });

    bench('handle event', async () => {
      const event = { jobPath: '/tmp/test.json', chunkIndex: 0 };
      await handler(event);
    });
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: AWS Lambda billing is based on execution duration. Minimizing handler overhead directly reduces costs for V2 distributed rendering.

#### 4. Test Plan
- **Verification**: `npm run bench -w packages/infrastructure -- tests/benchmarks/aws-handler.bench.ts --run`
- **Success Criteria**: The benchmark executes successfully and outputs performance metrics (e.g., ops/sec) for the AWS Lambda handler.
- **Edge Cases**: N/A for benchmarks.
- **Integration Verification**: Ensure the benchmark script runs without errors in the CI/CD pipeline.