# CLI Build Command Regression Tests

## 1. Context & Goal
- **Objective**: Implement comprehensive unit tests for the `helios build` command to ensure stability and prevent regressions.
- **Trigger**: The CLI domain is actively expanding, and while core commands have test coverage, the `build` command lacks unit tests in the `__tests__` directory, presenting a risk to the production build pipeline stability.
- **Impact**: Ensures that future changes to the CLI do not break project bundling and production builds, aligning with the "Maintenance & Stability" core requirement.

## 2. File Inventory
- **Create**: `packages/cli/src/commands/__tests__/build.test.ts` (Unit tests for the build command)
- **Modify**: None
- **Read-Only**: `packages/cli/src/commands/build.ts` (To understand the logic being tested)

## 3. Implementation Spec
- **Architecture**:
  - Use `vitest` for test execution.
  - Mock `fs` (`existsSync`, `writeFileSync`, `renameSync`, `unlinkSync`) to prevent actual file system modifications during tests.
  - Mock `vite`'s `build` function to verify that it is invoked with the correct configuration parameters (`root`, `outDir`, `emptyOutDir`, `rollupOptions`).
  - Mock `console.log` and `console.error` to allow assertions on CLI output and suppress test noise.
  - Mock `process.exit` to control execution flow and `process.cwd` to set the working directory context.
- **Pseudo-Code**:
  ```typescript
  // Mock dependencies
  vi.mock('fs');
  vi.mock('vite');

  describe('build command', () => {
    it('successfully builds when composition.html exists', async () => {
      // Setup mocks to pretend composition.html exists
      // Invoke command with test arguments
      // Verify vite.build was called with correct config
      // Verify file renaming and cleanup occurred
    });

    it('errors when composition.html is missing', async () => {
      // Setup mocks to pretend composition.html is missing
      // Verify process.exit(1) was called
    });

    it('handles vite build failure gracefully', async () => {
      // Setup vite.build mock to throw
      // Verify process.exitCode = 1 and cleanup still occurred
    });
  });
  ```
- **Public API Changes**: None
- **Dependencies**: None

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli -- build.test.ts` to execute the newly created test suite.
- **Success Criteria**: All tests pass successfully, achieving full line coverage for `packages/cli/src/commands/build.ts` without causing side effects on the actual file system.
- **Edge Cases**:
  - `composition.html` not being found.
  - Vite throwing an asynchronous error.
  - Cleanup logic executing even if the build fails.
  - Output directory being properly handled and passed to vite.
