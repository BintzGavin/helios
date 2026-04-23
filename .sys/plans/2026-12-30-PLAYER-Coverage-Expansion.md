#### 1. Context & Goal
- **Objective**: Expand test coverage for Player interactions to ensure robustness.
- **Trigger**: Reached equilibrium with documented features; prioritizing stability.
- **Impact**: Prevents regressions in interactive components and overlay behaviors.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/player/src/interaction.test.ts`
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Standard Vitest unit testing using jsdom environment.
- **Pseudo-Code**:
  - Add tests in `interaction.test.ts` to cover edge cases of menu closing logic (e.g. clicking Export closes Settings and vice-versa).
  - Add tests to ensure `export-options` parsing is strictly passed to `ClientSideExporter`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx vitest run packages/player/src/interaction.test.ts`
- **Success Criteria**: Tests pass and branch coverage remains at or improves towards 100%.
- **Edge Cases**: Ensure simulated UI events do not pollute subsequent tests via DOM state leak.
