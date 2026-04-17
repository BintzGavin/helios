#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios preview` command.
- **Trigger**: The V2 CLI direction requires a robust test suite to maintain stability, and the `preview` command currently lacks unit tests (`docs/status/CLI.md` specifically lists regression tests for remaining commands under "Next Steps").
- **Impact**: This unlocks reliable automated testing for the `helios preview` command, ensuring that local production build previews function correctly and handle edge cases gracefully without manual verification.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/preview.test.ts`: New test file containing the Vitest test suite for the `preview` command.
- **Modify**: []
- **Read-Only**:
  - `packages/cli/src/commands/preview.ts`: The source file being tested to understand the required mock behavior and expected execution flow.
  - `packages/cli/package.json`: To check the testing framework (Vitest) configuration.

#### 3. Implementation Spec
- **Architecture**:
  - Utilize Vitest and `commander` testing patterns similar to existing CLI tests (e.g., `build.test.ts`).
  - Mock external dependencies: `fs` (for `existsSync`), `path` (for `resolve`), and `vite` (for `preview`).
  - Mock `process.exit` and `console.error` to capture output and prevent the test runner from exiting prematurely during failure scenarios.
  - Ensure clear restoration of all mocks before/after each test run to prevent cross-test pollution.
- **Pseudo-Code**:
  - **Setup**:
    - Mock `vite`'s `preview` to return an object with a `printUrls` method.
    - Mock `fs.existsSync` to control whether the output directory exists.
    - Mock `process.exit`, `console.log`, and `console.error`.
    - Instantiate a new `Command`, mock its `exitOverride`, and register `preview` using `registerPreviewCommand`.
  - **Tests**:
    - "should successfully start the preview server with default options": Setup `fs.existsSync` to return true. Call `parseAsync(['preview'])`. Verify `vite.preview` is called with default `outDir` ('dist') and `port` (4173), and `server.printUrls` is called.
    - "should respect custom port and output directory options": Setup `fs.existsSync` to return true. Call `parseAsync(['preview', '--port', '8080', '--out-dir', 'custom-build'])`. Verify `vite.preview` is called with port 8080 and `outDir` 'custom-build'.
    - "should fail gracefully if the output directory does not exist": Setup `fs.existsSync` to return false. Call `parseAsync(['preview'])`. Verify `console.error` logs the missing directory and `process.exit(1)` is called.
    - "should fail gracefully if vite preview throws an error": Setup `fs.existsSync` to return true and mock `vite.preview` to reject with an error. Call `parseAsync(['preview'])`. Verify `console.error` logs the failure and `process.exit(1)` is called.
- **Public API Changes**: None. This is internal test infrastructure.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w @helios-project/cli` (or execute `npx vitest packages/cli/src/commands/__tests__/preview.test.ts` from root).
- **Success Criteria**: All tests in `preview.test.ts` pass, achieving high coverage for `packages/cli/src/commands/preview.ts`.
- **Edge Cases**:
  - The build directory is missing.
  - The Vite server fails to start.
  - Custom ports and directories are passed.