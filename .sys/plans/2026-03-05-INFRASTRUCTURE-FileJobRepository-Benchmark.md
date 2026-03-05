#### 1. Context & Goal
- **Objective**: Add performance benchmarks to `FileJobRepository`.
- **Trigger**: "Allowed fallback actions" per AGENTS.md (Benchmarks) as no other gaps exist.
- **Impact**: Ensures it can handle high-throughput job updates and reads required for distributed rendering.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/file-job-repository.bench.ts` (The benchmark implementation)
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/orchestrator/file-job-repository.ts`

#### 3. Implementation Spec
- **Architecture**: Benchmark using `vitest bench` to measure read and write throughput of `FileJobRepository`. Use temporary files and cleanup in hooks.
- **Pseudo-Code**:
  ```typescript
  // beforeAll: Setup temp directory
  // afterAll: Cleanup temp directory
  // bench('write throughput'): loop and write jobs
  // bench('read throughput'): loop and read jobs
  ```
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: `npm run bench -w packages/infrastructure -- tests/benchmarks/file-job-repository.bench.ts --run`
- **Success Criteria**: Benchmark completes successfully and prints throughput metrics without timeout or missing directory errors.
- **Edge Cases**: Ensure concurrent read/write operations don't crash.
- **Integration Verification**: Ensure it passes `npm test -w packages/infrastructure` seamlessly alongside other tests.
