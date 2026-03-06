#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios add` command.
- **Trigger**: The CLI domain is currently aligned with V2 features, triggering the "Regression tests" fallback action as defined in AGENTS.md. The `add` command handles complex logic (checking configuration, resolving registry client, and installing components) but lacks unit tests in `packages/cli/src/commands/__tests__/`.
- **Impact**: Ensures the stability of the component installation experience, guarantees correct tracking in `helios.config.json`, and prevents future regressions when modifying the registry client or install utilities.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/add.test.ts` (Unit test suite for the add command)
- **Modify**: None
- **Read-Only**:
  - `packages/cli/src/commands/add.ts` (To understand the logic being tested)
  - `packages/cli/src/utils/install.ts` (To mock install functionality)
  - `packages/cli/src/utils/config.ts` (To mock config loading)
  - `packages/cli/src/registry/client.ts` (To mock registry component resolution)

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` to define the test suite for `registerAddCommand`.
  - Use `vi.mock()` to mock external dependencies: `../utils/config.js` (to supply mock configurations), `../utils/install.js` (to mock `installComponent`), and `../registry/client.js` (to mock `RegistryClient`).
  - Instantiate a new Commander program in each test, register the add command, and call `program.parseAsync()`.
- **Pseudo-Code**:
  - Mock `installComponent` to verify correct arguments are passed.
  - Write test cases:
    - Missing Config: Handled correctly by throwing an error if `getConfigOrThrow` fails.
    - Successful Installation: Config is loaded, `RegistryClient` instantiated, and `installComponent` called with correct parameters.
    - No Install Flag: When `--no-install` flag is used, `installComponent` is called with `install: false`.
    - Error Handling: Test failure cases like registry errors to ensure it exits with code 1.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run the test suite using `npm run test -w packages/cli -- src/commands/__tests__/add.test.ts`.
- **Success Criteria**: All tests in `packages/cli/src/commands/__tests__/add.test.ts` pass, successfully validating the internal logic of the add command across multiple scenarios.
- **Edge Cases**:
  - `getConfigOrThrow` throwing an error.
  - Registry failing to initialize.