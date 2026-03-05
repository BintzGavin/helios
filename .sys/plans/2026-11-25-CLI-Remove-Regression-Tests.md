#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios remove` command.
- **Trigger**: The CLI domain is currently aligned with V2 features, triggering the "Regression tests" fallback action as defined in AGENTS.md. The `remove` command handles complex logic (checking configuration, resolving component files, checking existing files, prompting users before deletion, and modifying the configuration) but lacks unit tests in `packages/cli/src/commands/__tests__/`.
- **Impact**: Ensures the stability of the component removal experience, guarantees correct tracking in `helios.config.json`, and prevents future regressions when modifying the registry client or uninstall utilities.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/remove.test.ts` (Unit test suite for the remove command)
- **Modify**: None
- **Read-Only**:
  - `packages/cli/src/commands/remove.ts` (To understand the logic being tested)
  - `packages/cli/src/utils/uninstall.ts` (To mock uninstall functionality)
  - `packages/cli/src/utils/config.ts` (To mock config loading)
  - `packages/cli/src/registry/client.ts` (To mock registry component resolution)

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` to define the test suite for `registerRemoveCommand`.
  - Use `vi.mock()` to mock external dependencies: `fs` (to mock file existence), `prompts` (to simulate user confirmation), `../utils/config.js` (to supply mock configurations), `../utils/uninstall.js` (to mock `uninstallComponent`), and `../registry/client.js` (to mock `RegistryClient`).
  - Instantiate a new Commander program in each test, register the remove command, and call `program.parseAsync()`.
- **Pseudo-Code**:
  - Mock `prompts` to return specific answers for user confirmations.
  - Write test cases:
    - Keep Files: When `--keep-files` flag is used, `uninstallComponent` is called with `removeFiles: false` and early returns.
    - Component Not Installed: Handled correctly (or passes through to uninstall function).
    - No Existing Files: If the files for the component don't exist on disk, bypass prompts and call `uninstallComponent` with `removeFiles: true`.
    - User Cancels Deletion: If files exist and the user declines the prompt, the command aborts without calling `uninstallComponent`.
    - User Confirms Deletion: If files exist and the user confirms, `uninstallComponent` is called with `removeFiles: true`.
    - Yes Flag: When `-y` or `--yes` flag is passed, skips prompt and deletes files directly.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run the test suite using `npm run test -w packages/cli -- src/commands/__tests__/remove.test.ts`.
- **Success Criteria**: All tests in `packages/cli/src/commands/__tests__/remove.test.ts` pass, successfully validating the internal logic of the remove command across multiple file-system states and interactive scenarios without actually modifying the disk.
- **Edge Cases**:
  - `loadConfig` returning undefined or null.
  - Component is in config but its files were already manually deleted by the user.
