#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios update` command.
- **Trigger**: The CLI domain is currently aligned with V2 features, triggering the "Regression tests" fallback action as defined in AGENTS.md. The `update` command handles important logic (user prompts, overwriting files, resolving dependencies) but lacks unit tests in `packages/cli/src/commands/__tests__/`.
- **Impact**: Ensures the stability of the component update experience, guarantees correct tracking and overwriting logic, and prevents future regressions.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/update.test.ts` (Unit test suite for the update command)
- **Modify**: None
- **Read-Only**:
  - `packages/cli/src/commands/update.ts` (To understand the logic being tested)
  - `packages/cli/src/utils/install.ts` (To mock install functionality)
  - `packages/cli/src/utils/config.ts` (To mock config loading)
  - `packages/cli/src/registry/client.ts` (To mock registry component resolution)

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` to define the test suite for `registerUpdateCommand`.
  - Use `vi.mock()` to mock external dependencies: `../utils/config.js`, `../utils/install.js`, `../registry/client.js`, and `readline` for user prompts.
  - Instantiate a new Commander program in each test, register the update command, and call `program.parseAsync()`.
- **Pseudo-Code**:
  - Mock `installComponent` to verify correct arguments are passed.
  - Mock `loadConfig` to provide a valid config containing the target component.
  - Write test cases:
    - Missing Config: Handled correctly by throwing an error and exiting.
    - Component Not Installed: Handled correctly by exiting if component not in config.
    - Successful Update with Prompt: User answers "y", `installComponent` called with `overwrite: true`.
    - User Cancels Update: User answers "n", `installComponent` not called.
    - Skip Confirmation Flag: Using `-y` or `--yes` skips prompt and calls `installComponent`.
    - No Install Flag: When `--no-install` flag is used, `installComponent` is called with `install: false`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run the test suite using `npm run test -w packages/cli -- src/commands/__tests__/update.test.ts`.
- **Success Criteria**: All tests in `packages/cli/src/commands/__tests__/update.test.ts` pass, successfully validating the internal logic of the update command across multiple scenarios.
- **Edge Cases**:
  - User answers variations of "yes" (e.g. "Y", "yes").
  - `loadConfig` returning null or an empty components list.
