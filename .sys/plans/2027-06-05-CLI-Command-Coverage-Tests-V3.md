# Context & Goal
- **Objective**: Implement missing test scenarios in CLI command regression tests for `build.ts`, `render.ts`, `studio.ts` and `init.ts` to improve code coverage.
- **Trigger**: The recent coverage test results in `packages/cli` highlight several uncovered lines in `init.ts`, `build.ts`, `render.ts`, and `studio.ts`. The previously completed plan `2027-06-05-CLI-Command-Coverage-Tests-V2.md` was seemingly insufficient or we missed some branches.
- **Impact**: Improving test coverage for CLI commands ensures the reliability of the tools developers use every day.

# File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/cli/src/commands/__tests__/init.test.ts`
  - `packages/cli/src/commands/__tests__/build.test.ts`
  - `packages/cli/src/commands/__tests__/render.test.ts`
  - `packages/cli/src/commands/__tests__/studio.test.ts`
- **Read-Only**:
  - `packages/cli/src/commands/init.ts`
  - `packages/cli/src/commands/build.ts`
  - `packages/cli/src/commands/render.ts`
  - `packages/cli/src/commands/studio.ts`

# Implementation Spec
- **Architecture**:
  - Using vitest, add unit test cases to cover the missing branches reported by `npx vitest run --coverage` for the specified files.
- **Pseudo-Code**:
  - For `init.ts`: Add tests covering missing scenarios identified by line coverage reports.
  - For `build.ts`: Add tests covering missing scenarios identified by line coverage reports.
  - For `render.ts`: Add tests covering missing scenarios identified by line coverage reports.
  - For `studio.ts`: Add tests covering missing scenarios identified by line coverage reports.
- **Public API Changes**: None
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/commands/__tests__` and check the coverage percentage.
- **Success Criteria**: 100% (or very near) lines and branch coverage for `build.ts`, `render.ts`, `studio.ts` and `init.ts`.
- **Edge Cases**: Ensure `process.exit` mocks work perfectly to avoid test suite exiting early.
