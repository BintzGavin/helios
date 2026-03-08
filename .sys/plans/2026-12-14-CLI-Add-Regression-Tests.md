#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios add` command.
- **Trigger**: The CLI domain has reached gravitational equilibrium for core feature completeness. We are executing the fallback action "Regression tests" to ensure the stability of the component addition process (`helios add`).
- **Impact**: Ensures that fetching components from the registry, writing them locally, and updating dependencies behaves correctly, preventing regressions in the core Shadcn-style component workflow.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/add.test.ts` (Unit test suite for the add command)
- **Modify**:
  - `packages/cli/src/commands/add.ts` (Add early return after process.exit to prevent test framework hanging)
- **Read-Only**:
  - `packages/cli/src/utils/install.ts` (To mock `installComponent`)
  - `packages/cli/src/utils/config.ts` (To mock `getConfigOrThrow`)
  - `packages/cli/src/registry/client.ts` (To mock `RegistryClient`)

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` for unit testing.
  - Use `vi.mock()` to mock `../utils/install.js`, `../registry/client.js`, and `../utils/config.js` dependencies.
  - Instantiate a new Commander program in each test, register the add command, and call `program.parseAsync()`.
- **Pseudo-Code**:
  - In `packages/cli/src/commands/add.ts`, insert an early `return;` immediately following the `process.exit(1)` call to prevent the testing framework (e.g., Vitest) from continuing execution after the exit is mocked.
  - In the test suite, mock `installComponent` to verify correct arguments.
  - Mock `process.exit` and `console.error` to test error handling cleanly.
  - Write test cases:
    - Normal Installation: Given valid config, it calls `installComponent` with `install: undefined` (which resolves to `true` by default in commander for a negated boolean option `--no-install` when the flag is omitted) and passes the component name.
    - No Install Flag: When `--no-install` flag is provided, it calls `installComponent` with `install: false`.
    - Error Handling: Tests failure cases (e.g. `getConfigOrThrow` throwing an error) to ensure it logs the error message and calls `process.exit(1)`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli -- src/commands/__tests__/add.test.ts`.
- **Success Criteria**: All tests in the file pass, successfully validating the internal logic of the add command across multiple scenarios.
- **Edge Cases**: Missing config file, registry errors, and `--no-install` flag.