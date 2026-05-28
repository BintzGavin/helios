#### 1. Context & Goal
- **Objective**: Improve CLI command regression tests for build, init, render, and studio commands to achieve 100% code coverage.
- **Trigger**: Backlog item "[v0.46.37] Fix CLI Test Coverage" - vitest coverage for CLI commands requires precision mocking of `process.exit` and handling of nested callbacks to reach 100%.
- **Impact**: Ensures core CLI commands are robust, edge cases are tested, and fulfills the fallback activity under the "NOTHING TO DO PROTOCOL" to close gaps in test coverage.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/cli/src/commands/__tests__/build.test.ts` (Add tests for branch coverage)
  - `packages/cli/src/commands/__tests__/init.test.ts` (Add tests for branch coverage)
  - `packages/cli/src/commands/__tests__/render.test.ts` (Add tests for branch coverage)
  - `packages/cli/src/commands/__tests__/studio.test.ts` (Add tests for branch coverage)
- **Read-Only**:
  - `packages/cli/src/commands/build.ts`
  - `packages/cli/src/commands/init.ts`
  - `packages/cli/src/commands/render.ts`
  - `packages/cli/src/commands/studio.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Update unit tests in Vitest for `build.ts`, `init.ts`, `render.ts`, and `studio.ts` using `vi.mock` for external dependencies (`fs`, `prompts`, `vite`, etc.) and spy on `process.exit` correctly throwing an error to stop execution when an exit is called.
  - Target uncovered branches identified in the coverage report:
    - `build.ts`: Uncovered Line #s 65-75 (Cleanup block for temporary file unlink, branch where file doesn't exist).
    - `init.ts`: Uncovered Line #s 191-192, 241-242 (Catch block for scaffold fail, saveConfig error block).
    - `render.ts`: Uncovered Line #s 153, 172-178 (Merge command conditional logic for audio/video codec options).
    - `studio.ts`: Uncovered Line #s 43-72 (onCheckInstalled callback logic returning false for missing component and non-existing files).
- **Pseudo-Code**:
  - `build.test.ts`: Ensure tests cover the `finally` block `fs.unlinkSync(entryPath)` execution by verifying what happens when the `entryPath` exists and when it does not exist after a successful or failed build.
  - `init.test.ts`: Check the catch branches by mocking `fs.promises.writeFile` to reject and checking if `console.error` logs "Failed to scaffold project" and mocking `saveConfig` to throw and checking if it logs "Failed to write configuration file".
  - `render.test.ts`: Write a test for `--emit-job` with `--audio-codec`, `--video-codec`, and `--quality` specified, and verify `mergeCommand` contains these flags in the emitted `job.json`. Include tests where videoCodec is "copy" to hit branch 153.
  - `studio.test.ts`: Extract `onCheckInstalled` from `studioApiPlugin` configuration, mock `fs.existsSync` to return false, check if it returns false when the component doesn't match and when the file doesn't exist.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli --if-present -- --coverage`
- **Success Criteria**: The coverage report shows 100% statement and branch coverage for `src/commands/build.ts`, `src/commands/init.ts`, `src/commands/render.ts`, and `src/commands/studio.ts`.
- **Edge Cases**: Missing files, unexpected errors in promises, default parameters, and process.exit interceptions.
