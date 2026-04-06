#### 1. Context & Goal
- **Objective**: Implement regression tests for the `helios build` command.
- **Trigger**: The CLI lacks test coverage for the build command, identified as a gap in verification.
- **Impact**: Ensures stability of the `helios build` command and prevents future regressions.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/__tests__/build.test.ts` (Unit tests for the build command)
- **Modify**: None
- **Read-Only**: `packages/cli/src/commands/build.ts`

#### 3. Implementation Spec
- **Architecture**: Create a Vitest suite to test the `registerBuildCommand` function. Mock `vite.build` and `fs` methods (specifically `existsSync`, `writeFileSync`, `renameSync`, `unlinkSync`) to simulate file operations and build processes without side effects.
- **Pseudo-Code**:
  - Setup: Mock `vite` and `fs`. Register the build command with Commander.
  - Test 1: Verify `vite.build` is called with correct arguments when `composition.html` exists.
  - Test 2: Verify the command exits with error if `composition.html` is missing.
  - Test 3: Verify the `--out-dir` option correctly configures the Vite build.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npx vitest packages/cli/src/commands/__tests__/build.test.ts`.
- **Success Criteria**: All tests pass, demonstrating proper mock interactions and error handling.
- **Edge Cases**: Ensure file mock handles `fs.existsSync` returning false correctly to trigger the missing composition error path.
