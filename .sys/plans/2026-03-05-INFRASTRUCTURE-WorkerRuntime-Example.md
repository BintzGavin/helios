#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `WorkerRuntime` for processing a rendering chunk.
- **Trigger**: The INFRASTRUCTURE domain has reached a state where all core V2 features are implemented. Following the "Nothing To Do Protocol", we are expanding our example coverage. While `aws-lambda` and `cloudrun` examples exist for cloud orchestration, there is no standalone example demonstrating how to directly invoke `WorkerRuntime` for custom cloud environments.
- **Impact**: Provides an executable example and reference for users integrating Helios into unsupported cloud environments (e.g., Azure Functions, custom Kubernetes jobs).

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/worker-runtime.ts`
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/worker/runtime.ts`, `packages/infrastructure/src/storage/local-storage.ts`

#### 3. Implementation Spec
- **Architecture**: Create a standalone Node.js script that constructs a mock `JobSpec`, sets up an `ArtifactStorage` (local storage), and directly invokes `WorkerRuntime.executeChunk()`.
- **Pseudo-Code**:
  1. Initialize `LocalStorageAdapter` referencing a temporary storage directory.
  2. Write a mock `job.json` to the storage directory to simulate a downloaded job specification.
  3. Initialize `WorkerRuntime` using the storage adapter.
  4. Call `WorkerRuntime.executeChunk` passing the local job URL and a chunk ID.
  5. Log the execution results (stdout, stderr, exit code).
  6. Clean up the temporary storage directory securely.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: This example serves as the foundational blueprint for users building custom cloud deployment handlers (e.g., for Azure or bare-metal servers) who need to directly bridge generic network payloads into Helios stateless execution.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/worker-runtime.ts`
- **Success Criteria**: The script executes, simulates the `WorkerRuntime` chunk processing lifecycle, prints the correct execution outcome, and exits cleanly.
- **Edge Cases**: The cleanup step must run in a `finally` block to ensure the temporary directory is removed even if the runtime throws an exception.
- **Integration Verification**: Ensure the example only relies on abstractions properly exported by `packages/infrastructure/src/index.ts`.
