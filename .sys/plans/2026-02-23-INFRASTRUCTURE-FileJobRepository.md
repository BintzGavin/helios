#### 1. Context & Goal
- **Objective**: Implement a `FileJobRepository` for `packages/infrastructure`.
- **Trigger**: The current job management relies solely on an `InMemoryJobRepository`, which loses state across restarts and doesn't support basic persistence. `docs/BACKLOG.md` requires robust distributed rendering suitable for cloud execution, which necessitates persistent state for orchestration.
- **Impact**: Allows jobs managed by `JobManager` to persist across Node process restarts, unlocking proper job queueing and distributed execution orchestration.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/orchestrator/file-job-repository.ts` (Implementation of `JobRepository` storing state in a directory of JSON files)
  - `packages/infrastructure/tests/orchestrator/file-job-repository.test.ts` (Unit tests for `FileJobRepository`)
- **Modify**:
  - `packages/infrastructure/src/orchestrator/index.ts` (Export `FileJobRepository`)
  - `packages/infrastructure/src/types/job-status.ts` (Export `JobRepository` interface to ensure clean imports)
- **Read-Only**:
  - `packages/infrastructure/src/types/job-status.ts`
  - `packages/infrastructure/src/orchestrator/job-manager.ts`

#### 3. Implementation Spec
- **Architecture**: Create a `FileJobRepository` class implementing `JobRepository`. The class uses a specified storage directory.
- **Pseudo-Code**:
  - `constructor(storageDir)`: Initializes the repository.
  - `async save(job)`: Uses `fs.promises.mkdir(storageDir, { recursive: true })` and `fs.promises.writeFile(path.join(storageDir, \`\${job.id}.json\`), JSON.stringify(job, null, 2))`.
  - `async get(id)`: Reads `\${job.id}.json`. Returns `undefined` if file does not exist.
  - `async list()`: Uses `fs.promises.readdir(storageDir)` to get all `.json` files, reads them, and returns an array of jobs.
- **Public API Changes**: Expose `FileJobRepository` in `@helios-project/infrastructure`.
- **Dependencies**: None.
- **Cloud Considerations**: This provides a foundation for eventual database-backed repositories (like DynamoDB or Firestore) by standardizing the `JobRepository` contract usage beyond memory.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npx vitest run tests/orchestrator/file-job-repository.test.ts`.
- **Success Criteria**:
  - `FileJobRepository` successfully saves a `JobStatus` object to a file.
  - `FileJobRepository` correctly retrieves a `JobStatus` object by ID.
  - `FileJobRepository` correctly lists all saved `JobStatus` objects.
  - `FileJobRepository` gracefully handles missing files.
- **Edge Cases**:
  - Directory does not exist on first `save`.
  - Retrieving an ID that does not exist returns `undefined` rather than throwing an error.
- **Integration Verification**: Ensure `npm test` in `packages/infrastructure` passes cleanly.
