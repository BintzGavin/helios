#### 1. Context & Goal
- **Objective**: Expand test coverage for `FileJobRepository` to achieve 100% statement and branch coverage.
- **Trigger**: The current code coverage analysis for `packages/infrastructure/src/orchestrator/file-job-repository.ts` shows uncovered lines (around line 70). This line handles throwing non-`ENOENT` errors caught from the outer `fs.readdir` operation in the `list` method.
- **Impact**: Ensures that unexpected filesystem errors (e.g., permission issues reading the storage directory) are properly propagated, improving the resiliency and predictable behavior of the repository.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/orchestrator/file-job-repository-resiliency.test.ts`
- **Read-Only**: `packages/infrastructure/src/orchestrator/file-job-repository.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing resiliency tests for the `list` method in `FileJobRepository` by simulating a non-`ENOENT` error (like `EACCES`) thrown from `fs.readdir`.
- **Pseudo-Code**:
  - In the `describe('list')` block, add a new test case: `it('should throw if fs.readdir fails with a permission error')`.
  - Create an error object with `code = 'EACCES'` and a descriptive message.
  - Mock `fs.readdir` to reject with this `EACCES` error.
  - Expect calling `repository.list()` to reject and throw the `EACCES` error, covering the `throw error;` line at the end of the `list` method.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: N/A

#### 4. Test Plan
- **Verification**: Run `npm run test -- --coverage` in the `packages/infrastructure/` directory.
- **Success Criteria**: The test suite should pass and the coverage report for `packages/infrastructure/src/orchestrator/file-job-repository.ts` should show 100% for lines, statements, functions, and branches.
- **Edge Cases**: Ensure the correct error code (`EACCES`) is asserted in the test mock, as `ENOENT` on `readdir` is already covered by the empty directory test.
- **Integration Verification**: Ensure all tests run successfully, confirming no regressions.
