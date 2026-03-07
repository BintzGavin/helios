#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `LocalWorkerAdapter` to execute a local process and stream output.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision. According to AGENTS.md, when no feature gaps exist, the agent must focus on allowed fallback actions. "Examples" are an explicitly allowed fallback action.
- **Impact**: Provides a concrete, runnable demonstration of how to configure and utilize the `LocalWorkerAdapter` abstraction, including process execution, timeout handling, and real-time log streaming.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/local-adapter.ts` (Example script demonstrating LocalWorkerAdapter process execution)
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/adapters/local-adapter.ts`
  - `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script that instantiates a `LocalWorkerAdapter` and dispatches several simulated `WorkerJob` configurations to showcase standard execution, argument passing, and timeout cancellation.
- **Pseudo-Code**:
  - Import `LocalWorkerAdapter` and `WorkerJob`.
  - Create a new `LocalWorkerAdapter` instance.
  - **Scenario 1 (Standard execution)**: Define a `WorkerJob` with `command: 'node'` and `args: ['-e', 'console.log("Hello from local worker")']`. Execute and log the `WorkerResult`.
  - **Scenario 2 (Log Streaming)**: Define a `WorkerJob` that emits multiple lines over time. Use `onStdout` and `onStderr` callbacks to print output as it streams, before the process completes.
  - **Scenario 3 (Timeout Handling)**: Define a `WorkerJob` that sleeps longer than its configured `timeout`. Catch the resulting error to demonstrate cancellation.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: This example uses local execution (`node -e` as a dummy command) to ensure it is easily runnable without actual cloud infrastructure, demonstrating the fundamental worker abstraction.

#### 4. Test Plan
- **Verification**:
  - Execute `npm run lint -w packages/infrastructure`.
  - Execute the script using `npx tsx packages/infrastructure/examples/local-adapter.ts` directly.
- **Success Criteria**:
  - The example has no linting errors.
  - The script runs without errors, executes the simulated commands, logs the worker result (including stdout, stderr, and duration), streams output correctly, and successfully catches the timeout error.
- **Edge Cases**: Ensure the process is cleanly killed during the timeout scenario.
- **Integration Verification**: N/A
