#### 1. Context & Goal
- **Objective**: Implement 100% test coverage for the remaining branch logic in the CLI commands `build.ts` and `studio.ts`.
- **Trigger**: The vitest coverage reports for `packages/cli` shows uncovered lines in `build.ts` for cleanup error handling (missing `unlinkSync` coverage if `.helios-build-entry.html` doesn't exist at cleanup time) and in `studio.ts` for `skillsRoot` branch missing coverage.
- **Impact**: Attaining 100% test coverage across the command components fulfills the regression testing goals outlined in the backlog.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/__tests__/build.test.ts`, `packages/cli/src/commands/__tests__/studio.test.ts`
- **Read-Only**: `packages/cli/src/commands/build.ts`, `packages/cli/src/commands/studio.ts`

#### 3. Implementation Spec
- **Architecture**: Use Vitest to expand edge case testing for `build` and `studio` commands:
  1. Add a test in `build.test.ts` to simulate a scenario where `fs.unlinkSync` is skipped if `.helios-build-entry.html` does not exist during the `finally` block cleanup.
  2. Add tests in `studio.test.ts` to hit the branch that skips printing the `Skills Root:` if the directory does not exist.
  3. Add a test in `studio.test.ts` to hit the branch handling missing `directories.components` in the config when validating component installation.
- **Pseudo-Code**:
  - `build.test.ts`: mock `existsSync` to return false when checking for `.helios-build-entry.html` in the finally block.
  - `studio.test.ts`: mock `existsSync` to return false when checking for the skills root. Provide a mocked config lacking `directories.components` to hit the fallback directory path `src/components/helios`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/commands/__tests__/build.test.ts src/commands/__tests__/studio.test.ts`
- **Success Criteria**: Line coverage should reach 100% for `build.ts` and `studio.ts`.
- **Edge Cases**: Make sure mocks properly resolve or reject based on specific file names passed to `existsSync`.
