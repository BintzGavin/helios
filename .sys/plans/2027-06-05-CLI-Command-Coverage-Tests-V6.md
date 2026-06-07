# 2027-06-05-CLI-Command-Coverage-Tests-V6

#### 1. Context & Goal
- **Objective**: Implement missing test branches in CLI commands `build.ts` and `init.ts` to achieve 100% command test coverage.
- **Trigger**: Vitest coverage report shows missing branches in `packages/cli/src/commands/build.ts` (lines 65-75) and `packages/cli/src/commands/init.ts` (lines 118-119).
- **Impact**: Fulfills the "CLI Command Coverage Tests Spec" requirements and ensures stability.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/__tests__/build.test.ts` (Add test to cover file unlink on error branch), `packages/cli/src/commands/__tests__/init.test.ts` (Add test to cover failing to download example catching block lines)
- **Read-Only**: `packages/cli/src/commands/build.ts`, `packages/cli/src/commands/init.ts`

#### 3. Implementation Spec
- **Architecture**: Use Vitest mocking to trigger the remaining edge cases.
- **Pseudo-Code**:
  - For `build.test.ts`: Add test case checking if `fs.unlinkSync` is called within the `finally` block when `fs.existsSync(entryPath)` is true and a build failure occurs.
  - For `init.test.ts`: Review existing tests since "failed to download example" already exists but maybe the mock doesn't properly cover the exact `catch` block structure without awaiting or due to some async execution details. Refactor the `init.test.ts` mock for `downloadExample` throwing an error inside the `action` flow to properly hit lines 118-119.
- **Public API Changes**: None
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli -- --coverage`.
- **Success Criteria**: Coverage report shows 100% for `packages/cli/src/commands/build.ts` and `packages/cli/src/commands/init.ts`.
- **Edge Cases**: Make sure to check that the missing branch lines are executed even if the other parts of the command are mocked.
