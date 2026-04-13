#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios build` command.
- **Trigger**: The CLI is undergoing stabilization (fallback action: Regression tests per `AGENTS.md`), and `build.ts` is a critical product surface missing test coverage.
- **Impact**: Ensures the production build pipeline remains stable and properly handles filesystem and Vite orchestration without regressions.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/__tests__/build.test.ts`
- **Modify**: `docs/status/CLI.md` (to log completion)
- **Read-Only**: `packages/cli/src/commands/build.ts`

#### 3. Implementation Spec
- **Architecture**: Use Vitest to mock Node.js `fs`/`path` modules and the `vite` builder. Verify that the command correctly verifies required files, orchestrates the `.helios-build-entry.html` temp file creation, invokes Vite with correct paths, handles renaming output files, and ensures cleanup.
- **Pseudo-Code**:
  - Mock `fs.existsSync`, `fs.writeFileSync`, `fs.renameSync`, `fs.unlinkSync`.
  - Mock `vite.build`.
  - Test 1: Successful build with default directory (verifies file checks, temporary file creation, Vite build invocation, file rename, and cleanup).
  - Test 2: Missing `composition.html` (verifies it logs error and process exits).
  - Test 3: Build failure (verifies Vite build throws, process exits, and temp file is still cleaned up).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run src/commands/__tests__/build.test.ts`
- **Success Criteria**: All tests pass, demonstrating the `build` command handles both happy paths and error states properly.
- **Edge Cases**:
  - Cleanup must execute even if Vite throws an error.
  - Output file renaming should only occur if the source file exists.
  - Custom output directory resolution should be verified.
