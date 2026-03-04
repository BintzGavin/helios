#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `helios init` command.
- **Trigger**: The CLI domain is currently aligned with V2 features, triggering the "Regression tests" fallback action as defined in AGENTS.md. The `init` command handles complex logic (scaffolding, examples, interactive prompts) but lacks unit tests in `packages/cli/src/commands/__tests__/`.
- **Impact**: Ensures the stability of the project scaffolding experience and prevents future regressions when adding new frameworks, examples, or options.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/init.test.ts` (Unit test suite for the init command)
- **Modify**: None
- **Read-Only**:
  - `packages/cli/src/commands/init.ts` (To understand the logic being tested)
  - `packages/cli/src/utils/examples.ts` (To mock example fetching and downloading)

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` to define the test suite for `registerInitCommand`.
  - Use `vi.mock()` to mock external dependencies: `fs` (to avoid writing to actual disk), `prompts` (to simulate user input), and the utility functions in `../utils/examples.js`.
  - Instantiate a new Commander program in each test, register the init command, and call `program.parseAsync()`.
- **Pseudo-Code**:
  - Mock `fs.existsSync`, `fs.mkdirSync`, `fs.promises.writeFile`, `fs.promises.mkdir`.
  - Mock `prompts` to return specific answers for different test scenarios.
  - Write test cases:
    - Default scaffolding: Scaffolds a React project when `--yes` is provided.
    - Directory check: Exits or prompts when the target directory is not empty.
    - Framework scaffolding: Respects the `--framework` flag to scaffold Vue, Svelte, Solid, or Vanilla projects.
    - Example usage: Calls `downloadExample` and `transformProject` when `--example` flag is provided.
    - Interactive flow: correctly captures inputs for framework, component dir, and lib dir when prompts are triggered.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run the test suite using `npm run test -w packages/cli`.
- **Success Criteria**: All tests in `packages/cli/src/commands/__tests__/init.test.ts` pass, successfully validating the internal logic of the init command across multiple scaffolding scenarios without writing files to the disk.
- **Edge Cases**:
  - Target directory is not empty and user declines to continue.
  - The `fetchExamples` call returns an empty list, falling back to templates.
  - Existing `helios.config.json` prevents overwriting unless `--yes` or an empty directory condition is met.
