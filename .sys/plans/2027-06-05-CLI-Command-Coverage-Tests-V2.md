#### 1. Context & Goal
- **Objective**: Improve test coverage for CLI commands (`render.ts`, `build.ts`, `init.ts`, `studio.ts`).
- **Trigger**: The fallback action under the NOTHING TO DO PROTOCOL is to add regression tests. Current coverage for `render.ts` is 25%, `build.ts` is 91.3%, `init.ts` is 75.83%, and `studio.ts` is 64.7%.
- **Impact**: Increased test coverage ensures that CLI commands handle all edge cases correctly and prevents future regressions.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/cli/src/commands/__tests__/render.test.ts`
  - `packages/cli/src/commands/__tests__/build.test.ts`
  - `packages/cli/src/commands/__tests__/init.test.ts`
  - `packages/cli/src/commands/__tests__/studio.test.ts`
- **Read-Only**: `packages/cli/src/commands/render.ts`, `packages/cli/src/commands/build.ts`, `packages/cli/src/commands/init.ts`, `packages/cli/src/commands/studio.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing `vitest` unit tests in the `__tests__` directory for the specified commands to cover missing branches and statements.
- **Pseudo-Code**:
  - In `render.test.ts`, add tests for the `--emit-job` flag, `--base-url` flag, and different render modes.
  - In `build.test.ts`, add tests for the failure case where `composition.html` is missing.
  - In `init.test.ts`, add tests for interactive prompts when `package.json` is missing and `--yes` is not provided.
  - In `studio.test.ts`, add tests for verifying the port argument and the `studioApiPlugin` configuration.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run test -w packages/cli -- --coverage`
- **Success Criteria**: Test coverage for `render.ts`, `build.ts`, `init.ts`, and `studio.ts` increases significantly, with a target of >90% for each file.
- **Edge Cases**: Ensure mocks correctly simulate file system state and command arguments.
