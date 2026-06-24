# CLI Command Coverage Tests V10

## 1. Context & Goal
- **Objective**: Achieve 100% test coverage for `packages/cli/src/commands/components.ts` (line 44) and `packages/cli/src/commands/update.ts` (lines 62-63) by implementing unit tests for missing branch executions, and document gaps for utils and registry.
- **Trigger**: Previous test coverage rounds exposed missing branches in `components.ts` (line 44, missing components handling) and `update.ts` (lines 62-63, update success messaging), preventing 100% test coverage metrics across the CLI workspace commands.
- **Impact**: Full execution and branch validation for `helios components` and `helios update` ensures reliable behavior and unblocks planning for other uncovered files (like `registry/client.ts` lines 90-91, 96-97, 137 and `utils/examples.ts` lines 10-11, 29-30).

## 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/__tests__/components.test.ts` (New test file if needed, or add to existing if applicable)
  - `packages/cli/src/commands/__tests__/update.test.ts` (Add tests to existing)
- **Modify**:
  - `packages/cli/src/commands/__tests__/components.test.ts`
  - `packages/cli/src/commands/__tests__/update.test.ts`
- **Read-Only**:
  - `packages/cli/src/commands/components.ts`
  - `packages/cli/src/commands/update.ts`

## 3. Implementation Spec
- **Architecture**: Use `vitest` to inject mock configurations and responses that specifically force execution through the uncovered lines.
- **Pseudo-Code**:
  - In `components.test.ts`, create a test where `client.getComponents` returns `[]` or `filtered.length === 0`, asserting that `console.log(chalk.yellow('No components found in registry.'));` is executed (line 44).
  - In `update.test.ts`, verify the happy path where `installComponent` succeeds, ensuring `console.log(chalk.green('\nSuccessfully updated ${component}!'));` is executed (lines 62-63).
- **Public API Changes**: None
- **Dependencies**: None

## 4. Test Plan
- **Verification**: Run `npx vitest run --coverage packages/cli/` to confirm lines 44 in `components.ts` and 62-63 in `update.ts` are covered.
- **Success Criteria**: 100% branch and statement coverage for `components.ts` and `update.ts`.
- **Edge Cases**:
  - Ensure mocking `process.exit(1)` does not crash the test suite when `update` fails.
  - Test filtering components in `components.ts` returns empty vs partially empty results.
