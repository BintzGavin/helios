#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios merge` command.
- **Trigger**: The CLI domain has reached gravitational equilibrium with all explicit V2 backlog items implemented. Following the "Nothing To Do Protocol", the fallback action is to improve regression test coverage for existing core product surfaces. The `helios merge` command lacks tests in `packages/cli/src/commands/__tests__/`.
- **Impact**: Ensures the `helios merge` command remains stable and prevents future regressions during transcoding or path resolution updates.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/__tests__/merge.test.ts` (Implement unit and regression tests for the `merge` command).
- **Read-Only**: `packages/cli/src/commands/merge.ts` (Understand the command's logic, dependencies, and file operations).

#### 3. Implementation Spec
- **Architecture**: Create a Vitest test suite for the `helios merge` command. Mock `path.resolve`, `console.log`, `console.error`, and `process.exit`. Spy on the `concatenateVideos` function from `@helios-project/renderer` and the `transcodeMerge` utility from `../utils/ffmpeg.js` to assert they are called correctly based on CLI flags.
- **Pseudo-Code**:
  - Import `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` from `vitest`.
  - Import `registerMergeCommand` from `../merge.js`.
  - Import `Command` from `commander`.
  - Mock `@helios-project/renderer` with `{ concatenateVideos: vi.fn() }`.
  - Mock `../../utils/ffmpeg.js` with `{ transcodeMerge: vi.fn() }`.
  - Set up a fresh `Command` instance and configure spies for `console.log`, `console.error`, and `process.exit` before each test.
  - Clear all mocks before each test execution inside the bench hot loop (if applicable).
  - **Test Cases**:
    - Should correctly parse `<output>` and `<inputs...>` arguments, resolve their absolute paths, and invoke `concatenateVideos` when no transcoding flags are present.
    - Should throw an error and exit with code 1 if no input files are provided.
    - Should invoke `transcodeMerge` with the correct options object when `--video-codec`, `--audio-codec`, `--quality`, or `--preset` flags are provided.
    - Should handle errors thrown by `concatenateVideos` or `transcodeMerge`, logging the error and exiting with code 1.
- **Public API Changes**: No changes to public APIs.
- **Dependencies**: Relies on Vitest infrastructure already present in the repository.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npm install --no-save --workspaces=false && npm run test` to execute the new test suite.
- **Success Criteria**: All tests in `packages/cli/src/commands/__tests__/merge.test.ts` pass, successfully verifying argument parsing, transcoding delegation, and error handling of the `helios merge` command.
- **Edge Cases**: Verify the mock implementation handles rejected promises from the underlying renderer and utility modules.
