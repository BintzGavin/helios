#### 1. Context & Goal
- **Objective**: Implement a `DockerAdapter` to execute distributed rendering jobs on local Docker containers or Docker Swarm.
- **Trigger**: `docs/BACKLOG.md` defines Tier 2 Cloud execution adapters, and Docker is the next platform for distributed rendering across local containers (perfect for on-prem or CI pipelines).
- **Impact**: Enables `JobExecutor` to use local Docker containers, bridging the gap between full cloud deployments and local process execution.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/adapters/docker-adapter.ts` - Implements `WorkerAdapter` using `docker run` via CLI spawn.
  - `packages/infrastructure/tests/adapters/docker-adapter.test.ts` - Unit tests for the adapter.
  - `examples/docker-rendering/example.js` - Standalone example showing DockerAdapter usage.
  - `packages/infrastructure/tests/benchmarks/docker-adapter.bench.ts` - Performance benchmarks.
- **Modify**:
  - `packages/infrastructure/src/adapters/index.ts` - Export the new adapter.
- **Read-Only**:
  - `packages/infrastructure/src/types/adapter.ts`
  - `packages/infrastructure/src/types/job.ts`

#### 3. Implementation Spec
- **Architecture**: Implements `WorkerAdapter` by spawning the `docker` CLI directly (to avoid `dockerode` dependency overhead).
  - The adapter takes an `image` name and optional docker run arguments.
  - `execute()` will:
    1. Spawn a `docker run` command via `child_process.spawn`.
    2. Pass `job.env` as `-e` arguments to the docker container.
    3. Pass `job.command` and `job.args` as the container's entrypoint/command.
    4. Capture stdout/stderr, stream them if callbacks are provided, and handle `AbortSignal` for container cancellation (`docker rm -f`).
    5. Return the `WorkerResult` containing `exitCode`, `stdout`, `stderr`, and `durationMs`.
- **Pseudo-Code**:
  ```
  Class DockerAdapter implements WorkerAdapter:
    Constructor(imageName, optionalArgs)

    Function execute(job: WorkerJob) -> Promise<WorkerResult>:
      1. Generate a unique container name.
      2. Construct docker run arguments:
         - Basic flags: run, --name, --rm
         - Map job.env and job.meta to -e flags
         - Append user-provided optional dockerArgs
         - Append imageName
         - Append job.command and job.args
      3. Spawn a child process executing the docker command.
      4. Listen to process stdout and stderr:
         - Capture output in local variables.
         - Call job.onStdout and job.onStderr callbacks if provided.
      5. If job.signal is provided:
         - Listen for 'abort' event.
         - On abort, spawn a new command: 'docker rm -f <containerName>'.
      6. Wait for process to close or error:
         - On close: Resolve promise with exitCode, captured stdout/stderr, and durationMs.
         - On error: Reject promise with the error.
         - Ensure abort listeners are cleaned up.
  ```
- **Public API Changes**: Exports `DockerAdapter` and `DockerAdapterOptions`.
- **Dependencies**: None (relies on local `docker` CLI).
- **Cloud Considerations**: Target is local Docker/Swarm for on-prem distributed rendering. Must ensure container cleanup (`--rm` and `docker rm -f` on abort).

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test` and `npm run lint`.
- **Success Criteria**: Tests pass. The adapter correctly formats the `docker run` command with `-e` args and cleans up the container on abort.
- **Edge Cases**: Handles process errors if `docker` is not installed. Respects `AbortSignal` for job cancellation.
- **Integration Verification**: Can be initialized and passed to `JobExecutor`.
