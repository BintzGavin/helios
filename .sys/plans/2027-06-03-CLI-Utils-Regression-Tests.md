#### 1. Context & Goal
- **Objective**: Implement comprehensive unit tests for the remaining uncovered utilities in `packages/cli/src/utils/`.
- **Trigger**: Following the "NOTHING TO DO PROTOCOL" from `AGENTS.md`, the CLI domain is currently feature-complete and stable. As a fallback action, we are improving test coverage by adding regression tests for utility functions that are currently only mocked in command tests.
- **Impact**: Ensures core CLI utilities (`ffmpeg.ts`, `package-manager.ts`, `uninstall.ts`) are robust against future changes, preventing regressions in deployment, installation, and cleanup workflows.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/utils/__tests__/ffmpeg.test.ts` (Unit tests for transcodeMerge)
  - `packages/cli/src/utils/__tests__/package-manager.test.ts` (Unit tests for package manager detection and installation)
  - `packages/cli/src/utils/__tests__/uninstall.test.ts` (Unit tests for component uninstallation logic)
- **Modify**: None
- **Read-Only**:
  - `packages/cli/src/utils/ffmpeg.ts`
  - `packages/cli/src/utils/package-manager.ts`
  - `packages/cli/src/utils/uninstall.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` for unit testing.
  - Mock external dependencies such as `child_process.spawn`, `fs.existsSync`, `fs.readFileSync`, `fs.unlinkSync`, `fs.rmdirSync`, and `path` to ensure tests are isolated and do not perform actual filesystem or execution side effects.
  - For `ffmpeg.ts`, mock `child_process.spawn` to capture FFmpeg arguments and test success/error events.
  - For `package-manager.ts`, mock file system checks to verify detection of `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`, and fallback to `npm`. Mock `spawn` to verify correct installation commands.
  - For `uninstall.ts`, mock `loadConfig` and `saveConfig` to verify state changes, and mock `RegistryClient` to simulate component file discovery and deletion.
- **Pseudo-Code**:
  - In `ffmpeg.test.ts`: Create a fake `spawn` process with an event emitter. Verify `transcodeMerge` sends the correct `file` list via stdin and passes options like `-c:v` and `-c:a`.
  - In `package-manager.test.ts`: Setup `fs.existsSync` mock to return true for specific lockfiles and assert `detectPackageManager` returns the correct string.
  - In `uninstall.test.ts`: Mock `fs.unlinkSync`, test that files are deleted when `removeFiles: true`, and that the `helios.config.json` components array is correctly updated.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli` after creating the test files.
- **Success Criteria**: Vitest reports that `ffmpeg.test.ts`, `package-manager.test.ts`, and `uninstall.test.ts` pass successfully, increasing overall coverage for `packages/cli/src/utils/`.
- **Edge Cases**:
  - Test `ffmpeg` with missing input paths.
  - Test package manager installation failing (spawn exit code non-zero).
  - Test uninstallation when a component is not listed in `helios.config.json` or when file deletion fails.

#### 5. Result
- **Status**: IMPOSSIBLE: DUPLICATION
- **Reason**: Discovered during implementation that the utility regression tests for `ffmpeg.ts`, `package-manager.ts`, and `uninstall.ts` are already fully implemented and pass successfully.
