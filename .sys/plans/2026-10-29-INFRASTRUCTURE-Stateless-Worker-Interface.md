# INFRASTRUCTURE: Stateless Worker Interface

## 1. Context & Goal
- **Objective**: Implement a `WorkerAdapter` interface and a `LocalWorkerAdapter` implementation to abstract execution environments.
- **Trigger**: Vision gap - AGENTS.md requires "Stateless workers" but no abstraction exists in `packages/infrastructure`.
- **Impact**: Enables `packages/infrastructure` to orchestrate renders across different environments (Local, AWS Lambda, Google Cloud Run) using a unified interface. This is the foundation for the "Cloud Execution" backlog items.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/worker/types.ts`: Define `WorkerAdapter`, `WorkerJob`, `WorkerResult` interfaces.
  - `packages/infrastructure/src/worker/LocalWorkerAdapter.ts`: Implementation for local process execution.
  - `packages/infrastructure/src/worker/index.ts`: Export new types and classes.
  - `packages/infrastructure/tests/worker/LocalWorkerAdapter.test.ts`: Unit tests for the local adapter.
- **Modify**:
  - `packages/infrastructure/src/index.ts`: Export worker module.
- **Read-Only**:
  - `packages/renderer/src/types.ts`: To understand what data needs to be passed to workers (though the worker abstraction should be generic).

## 3. Implementation Spec
- **Architecture**:
  - `WorkerAdapter` is a strategy pattern interface.
  - `execute(job: WorkerJob): Promise<WorkerResult>` is the core method.
  - `WorkerJob` contains `command`, `args`, `env`, and `cwd`.
  - The abstraction focuses on *executing a command* in a specific environment, not necessarily knowing it's a "render" job. This keeps infrastructure generic.
- **Pseudo-Code**:
  ```typescript
  export interface WorkerJob {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    timeout?: number;
  }

  export interface WorkerResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
  }

  export interface WorkerAdapter {
    execute(job: WorkerJob): Promise<WorkerResult>;
  }

  export class LocalWorkerAdapter implements WorkerAdapter {
    async execute(job: WorkerJob): Promise<WorkerResult> {
      // Use child_process.spawn to run the command
      // Capture stdout/stderr
      // Return exit code and output
      // Handle timeout if provided
    }
  }
  ```
- **Public API Changes**:
  - New exports from `@helios-project/infrastructure`: `WorkerAdapter`, `LocalWorkerAdapter`, `WorkerJob`, `WorkerResult`.
- **Dependencies**: None.
- **Cloud Considerations**: The interface must support environment variables and distinct commands, which maps well to Lambda/Cloud Run container overrides.

## 4. Test Plan
- **Verification**: `npm test` in `packages/infrastructure`.
- **Success Criteria**:
  - `LocalWorkerAdapter` successfully runs a simple shell command (e.g., `echo "hello"`).
  - Captures stdout correctly.
  - Handles non-zero exit codes correctly (throws or returns error status).
- **Edge Cases**:
  - Command not found.
  - Process timeout (if implemented).
  - Large output buffers.
