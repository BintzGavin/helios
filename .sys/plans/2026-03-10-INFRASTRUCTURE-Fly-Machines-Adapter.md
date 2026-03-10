# 2026-03-10-INFRASTRUCTURE-Fly-Machines-Adapter

## 1. Context & Goal
- **Objective**: Implement a `WorkerAdapter` for Fly.io Machines.
- **Trigger**: Expanding distributed rendering to Fly.io as per `docs/BACKLOG.md` (Tier 1).
- **Impact**: Enables true pay-per-frame distributed rendering by provisioning and executing jobs on Fly.io Machines, with the potential for GPU access for WebGL-heavy compositions.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/fly-machines-adapter.ts` (Fly.io adapter implementation)
  - `packages/infrastructure/tests/adapters/fly-machines-adapter.test.ts` (Unit tests)
  - `packages/infrastructure/tests/benchmarks/fly-machines-adapter.bench.ts` (Performance benchmarks)
  - `examples/fly-machines-execution/index.ts` (Example usage)
  - `examples/fly-machines-execution/package.json` (Example usage)
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` (Export the new adapter)
- **Read-Only**:
  - `packages/infrastructure/src/types/index.ts`
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/types/job.ts`
  - `docs/BACKLOG.md`

## 3. Implementation Spec
- **Architecture**: Implement the `WorkerAdapter` interface (`execute(job: WorkerJob): Promise<WorkerResult>`). The adapter will interact with the Fly.io Machines REST API to:
  1. Create a Machine with the specified job payload and container image.
  2. Wait for the Machine to exit (polling or webhook).
  3. Collect the output/logs.
  4. Destroy the Machine.
- **Pseudo-Code**:
  ```typescript
  import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';

  export interface FlyMachinesAdapterConfig {
    apiToken: string;
    appName: string;
    image: string;
    region?: string;
  }

  export class FlyMachinesAdapter implements WorkerAdapter {
    constructor(private config: FlyMachinesAdapterConfig) {}
    async execute(job: WorkerJob): Promise<WorkerResult> {
      // 1. Call Fly API to create a Machine with the job payload as env vars or args.
      // 2. Wait for the Machine state to become 'stopped' or 'destroyed'.
      // 3. Fetch logs for stdout/stderr or output file if applicable.
      // 4. Cleanup the Machine if not auto-destroyed.
      // 5. Return WorkerResult.
    }
  }
  ```
- **Public API Changes**:
  - Export `FlyMachinesAdapter` and `FlyMachinesAdapterConfig` from `packages/infrastructure/src/adapters/index.ts`.
- **Dependencies**: None. Uses native `fetch`.
- **Cloud Considerations**: Fly Machines take longer to spin up compared to Lambda/Cloudflare Workers. Polling logic must handle transient errors and timeouts gracefully. Machine lifecycle management (create, wait, destroy) is critical to avoid leaking resources.

## 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test -- tests/adapters/fly-machines-adapter.test.ts`
- **Success Criteria**: Tests pass, verifying that the adapter correctly formats Fly API requests, handles polling for machine state, processes logs, and manages cleanup.
- **Edge Cases**:
  - Machine fails to start.
  - Machine times out.
  - API rate limits or network errors during polling.
- **Integration Verification**: Can be manually tested with a valid Fly.io API token if needed, but unit tests will mock `fetch`.
