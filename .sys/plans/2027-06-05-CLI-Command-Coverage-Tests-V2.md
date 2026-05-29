# Context & Goal
- **Objective**: Identify the missing test scenarios in CLI command regression tests and implement them to improve code coverage.
- **Trigger**: Coverage report and test suites currently show unhandled/untested scenarios for `build.ts`, `render.ts`, `studio.ts` and `job.ts`.
- **Impact**: Increased test coverage guarantees robustness and provides better safety nets against regressions for future improvements.

# File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/cli/src/commands/__tests__/build.test.ts`
  - `packages/cli/src/commands/__tests__/render.test.ts`
  - `packages/cli/src/commands/__tests__/studio.test.ts`
  - `packages/cli/src/commands/__tests__/job.test.ts`
- **Read-Only**:
  - `packages/cli/src/commands/build.ts`
  - `packages/cli/src/commands/render.ts`
  - `packages/cli/src/commands/studio.ts`
  - `packages/cli/src/commands/job.ts`

# Implementation Spec
1. **Build Command (`build.test.ts`)**:
   - Add test case verifying the cleanup of `entryPath` within the `finally` block even if the build completes successfully.
   - Mock `fs.existsSync` conditionally to simulate `fs.renameSync` branch coverage (where `builtEntryPath` exists).

2. **Render Command (`render.test.ts`)**:
   - Add tests covering the `catch` block on `startFrame`, `frameCount`, and `concurrency` to mock string values passed from Commander arguments triggering throwing error messages.
   - Include branch coverage for testing `options.audioCodec` and `options.videoCodec` properties when parsing `emitJob`.

3. **Studio Command (`studio.test.ts`)**:
   - Mock different framework variations during the load of `config` (`vue`, `solid`, `svelte`, etc) to ensure branches in `RegistryClient` setup are covered.
   - Verify the internal logic of the fallback checks for `__filename` missing by mocking `import.meta.url` properly where possible.

4. **Job Command (`job.test.ts`)**:
   - Mock missing error paths for all adapters (e.g. Fly.io missing args, Docker missing image, etc) that currently only throw but are not tested in the suite explicitly.

# Test Plan
- **Verification**: Run `npm run test --workspace=packages/cli -- --coverage` (or vitest with coverage directly) to verify increased lines, statements, branches, and function coverage.
- **Success Criteria**: 100% (or very near) lines and branch coverage for `build.ts`, `render.ts`, `studio.ts` and `job.ts`.
- **Edge Cases**: Verify that testing process.exit does not crash the test suite unintentionally by proper Vitest mocking.
