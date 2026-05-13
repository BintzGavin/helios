#### 1. Context & Goal
- **Objective**: Implement unit tests for the main CLI entry point (`packages/cli/src/index.ts`).
- **Trigger**: The CLI domain is in a stable state with no active deltas. Following the "NOTHING TO DO PROTOCOL" fallback actions, we have saturated test coverage across `commands`, `utils`, `registry`, and `templates`. The final uncovered core file is `index.ts`.
- **Impact**: Ensures that all Commander.js subcommands are correctly registered and the CLI root parses arguments without errors, completing the regression testing surface for the CLI package.

#### 2. File Inventory
- **Create**: `packages/cli/src/__tests__/index.test.ts` (Unit tests for the CLI entry point)
- **Modify**: None
- **Read-Only**: `packages/cli/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Use Vitest to mock the Commander `Command` class and verify that `register*Command` functions are called for all subcommands (studio, init, add, components, render, merge, list, remove, update, build, preview, job, skills, diff, deploy).
- **Pseudo-Code**:
  - Mock `commander`
  - Mock all `./commands/*` files
  - Import `index.ts` (which triggers execution)
  - Assert `program.parse` was called
  - Assert each `registerXCommand` was called with the program instance
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli`
- **Success Criteria**: The `index.test.ts` file should pass, and `packages/cli/src/index.ts` should show 100% test coverage.
- **Edge Cases**: Ensure side-effects of `import './index.ts'` don't crash the test runner due to `process.argv` parsing.
