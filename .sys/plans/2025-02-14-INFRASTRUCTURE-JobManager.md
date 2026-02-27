# 2025-02-14-INFRASTRUCTURE-JobManager

## 1. Context & Goal
- **Objective**: Implement a `JobManager` to orchestrate the lifecycle of distributed rendering jobs.
- **Trigger**: `AGENTS.md` (Infrastructure section) and `docs/BACKLOG.md` require robust job management and orchestration.
- **Impact**: This component is the brain of the distributed rendering system. It will track job status, manage retries at a job level (distinct from chunk retries), and provide an abstraction for persistence (in-memory, database, etc.). It enables the CLI and future API servers to submit and monitor jobs reliably.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/orchestrator/job-manager.ts`: The main `JobManager` class.
  - `packages/infrastructure/src/types/job-status.ts`: Types for `JobStatus`, `JobState`, and `JobRepository`.
- **Modify**:
  - `packages/infrastructure/src/orchestrator/index.ts`: Export `JobManager`.
  - `packages/infrastructure/src/types/index.ts`: Export new types.
- **Read-Only**:
  - `packages/infrastructure/src/orchestrator/job-executor.ts`: The existing executor class.
  - `packages/infrastructure/src/types/job-spec.ts`: Existing job specification types.

## 3. Implementation Spec
- **Architecture**:
  - **JobManager**: The central class. It uses a `JobRepository` to store state and a `JobExecutor` to run jobs.
  - **JobRepository**: An interface for storage. We will implement an `InMemoryJobRepository` initially.
  - **JobStatus**: A comprehensive object tracking the state of a job (pending, running, completed, failed, cancelled), progress (completed chunks / total chunks), and results.

- **Pseudo-Code**:
  ```typescript
  // types/job-status.ts
  export type JobState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  export interface JobStatus {
    id: string;
    state: JobState;
    progress: number; // 0-100
    totalChunks: number;
    completedChunks: number;
    error?: string;
    createdAt: number;
    updatedAt: number;
    result?: any; // Output location, etc.
  }

  export interface JobRepository {
    save(job: JobStatus): Promise<void>;
    get(id: string): Promise<JobStatus | undefined>;
    list(): Promise<JobStatus[]>;
  }

  // orchestrator/job-manager.ts
  export class JobManager {
    constructor(
      private repository: JobRepository,
      private executor: JobExecutor
    ) {}

    async submitJob(jobSpec: JobSpec): Promise<string> {
      const id = crypto.randomUUID();
      const job: JobStatus = {
        id,
        state: 'pending',
        progress: 0,
        totalChunks: jobSpec.chunks.length,
        completedChunks: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.repository.save(job);

      // Execute in background
      this.runJob(id, jobSpec).catch(err => {
         console.error(`Unhandled error in job ${id}:`, err);
      });

      return id;
    }

    private async runJob(id: string, jobSpec: JobSpec) {
      // update state to running
      // delegate to executor
      // on complete/fail, update state
    }

    async getJob(id: string) { return this.repository.get(id); }
  }
  ```

- **Public API Changes**:
  - Export `JobManager`, `JobStatus`, `JobRepository`, `InMemoryJobRepository`.

- **Dependencies**:
  - Needs `crypto` for UUID generation (standard in Node).
  - Depends on `JobExecutor` (already exists).

- **Cloud Considerations**:
  - The `JobRepository` interface allows swapping the in-memory storage for Redis/DynamoDB/Firestore later for true cloud resilience.
  - The `JobManager` is stateless regarding *execution* (it delegates to `JobExecutor`), but stateful regarding *monitoring*.

## 4. Test Plan
- **Verification**: Run `npm test` in `packages/infrastructure`.
- **Success Criteria**:
  - `JobManager.submitJob` creates a job and returns an ID.
  - `JobManager.getJob` returns the correct status.
  - Mocking `JobExecutor` verifies that the manager correctly transitions states (running -> completed/failed).
  - Test `InMemoryJobRepository` strictly conforms to the interface.
- **Edge Cases**:
  - Job fails immediately.
  - Repository write failure (if we mock it to fail).
  - Retrieving a non-existent job.
- **Integration Verification**:
  - Create a test that instantiates `JobManager` with a `LocalWorkerAdapter` (mocked or real) and runs a simple job, polling `getJob` until completion.
