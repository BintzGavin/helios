#### 1. Context & Goal
- **Objective**: Improve test coverage for the `render`, `build`, `init`, and `studio` commands in the CLI to reach 100% statement coverage.
- **Trigger**: The NOTHING TO DO PROTOCOL allows regression tests and test improvements as a fallback when there are no active features to develop. Vitest coverage revealed missing coverage for error handling and process.exit branches due to mocking limitations.
- **Impact**: Improving coverage ensures all branches and error handling paths in CLI commands are explicitly verified, fulfilling the system requirement to eliminate untested code paths before idling.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/cli/src/commands/__tests__/render.test.ts` (Add tests for missing lines `17`, `133-153`, `172`, `175`, `178`)
  - `packages/cli/src/commands/__tests__/build.test.ts` (Add tests for missing lines `65-75`)
  - `packages/cli/src/commands/__tests__/init.test.ts` (Add tests for missing lines `103-119`, `192`, `241-242`)
  - `packages/cli/src/commands/__tests__/studio.test.ts` (Add tests for any missing coverage, assuming there might be some process.exit or error paths missed)
- **Read-Only**:
  - `packages/cli/src/commands/render.ts`
  - `packages/cli/src/commands/build.ts`
  - `packages/cli/src/commands/init.ts`
  - `packages/cli/src/commands/studio.ts`
  - `packages/cli/vitest.config.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing Vitest test files for CLI commands to mock `process.exit`, `console.error`, and dependent utility functions dynamically to force execution down uncovered error and validation branches.
- **Pseudo-Code**:
  - For `render.test.ts`: Mock `console.error` and `process.exit` correctly. Test the path where `job-base-url` logic is evaluated and where unexpected runtime exceptions occur in `renderer.render()`.
  - For `build.test.ts`: Add test cases for when the output directory creation fails or the build step encounters a generic exception, ensuring the catch blocks are reached.
  - For `init.test.ts`: Add tests covering the `promptForConfig` when users reject scaffolding, when reading `helios.config.json` fails, or when a specific validation branch like missing frameworks evaluates.
  - For `studio.test.ts`: Ensure testing of scenarios where the studio dev server fails to start.
- **Public API Changes**: None
- **Dependencies**: None. Can be done immediately.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/commands/__tests__/render.test.ts src/commands/__tests__/build.test.ts src/commands/__tests__/init.test.ts src/commands/__tests__/studio.test.ts`.
- **Success Criteria**: The coverage report shows 100% statement, branch, and function coverage for `render.ts`, `build.ts`, `init.ts`, and `studio.ts`.
- **Edge Cases**: Ensure mocks for `process.exit` are scoped per test or restored cleanly to prevent test suite premature exit. Use `vi.spyOn(process, 'exit').mockImplementation(...)`.
