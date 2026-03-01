#### 1. Context & Goal
- **Objective**: Integrate `@helios-project/infrastructure`'s `JobExecutor` into the CLI's `helios job run` command, replacing the hardcoded `spawn` loop.
- **Trigger**: The status journal entry (`[0.35.0] - Pluggable Execution Disconnect`) and the vision gap from `AGENTS.md` and `docs/BACKLOG.md` indicating that the CLI must be actively integrated with new platform capabilities for distributed rendering orchestration.
- **Impact**: It unifies job execution in the CLI with the core `JobExecutor` logic from `packages/infrastructure`, making execution pluggable, reliable, and compliant with the "Stateless Worker" architecture.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/job.ts` - Refactor `job run` to use `JobExecutor` and `LocalWorkerAdapter`.
- **Modify**: `packages/cli/package.json` - Add `@helios-project/infrastructure` as a dependency.
- **Read-Only**: `packages/infrastructure/src/orchestrator/job-executor.ts`
- **Read-Only**: `packages/infrastructure/src/adapters/local-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: The CLI's `job run` command currently uses a custom queuing and `spawn` loop to execute chunks and merge them. This should be replaced by importing `JobExecutor` and `LocalWorkerAdapter` from `@helios-project/infrastructure`. We will instantiate a `LocalWorkerAdapter` and pass it to a new `JobExecutor`. We will call `executor.execute(jobSpec, executionOptions)` where `executionOptions` includes properties like `concurrency`, `merge`, and `jobDir`. If the user passes `--chunk`, we will pass it using `completedChunkIds` to exclude others, or adjust the `JobSpec`'s `chunks` array to just that single chunk before passing it to the executor.
- **Pseudo-Code**:
  - Add `@helios-project/infrastructure` dependency to `package.json` and install.
  - In `job.ts`, import `JobExecutor`, `LocalWorkerAdapter`.
  - Inside `jobCommand.command('run <file>').action(...)`:
    - Load the `jobSpec` using `loadJobSpec`.
    - Handle `--chunk` option: filter `jobSpec.chunks` to only the requested chunk.
    - Create `adapter = new LocalWorkerAdapter()`.
    - Create `executor = new JobExecutor(adapter)`.
    - Await `executor.execute(jobSpec, { concurrency, jobDir, merge })`.
  - Handle errors appropriately.
- **Public API Changes**: No changes to public APIs, just refactoring internal command behavior.
- **Dependencies**: No cross-domain blockers.

#### 4. Test Plan
- **Verification**: Run `helios job run <job.json>` with a dummy job JSON and verify the command successfully delegates execution to `JobExecutor` and logs chunk progress correctly.
- **Success Criteria**: The CLI uses `JobExecutor` seamlessly, outputting logs via `onProgress` and `onChunkComplete`, and the tests pass.
- **Edge Cases**:
  - Validating correct processing when `--chunk` is specified.
  - Validating `--no-merge` skips the merge step via the `JobExecutor`.
