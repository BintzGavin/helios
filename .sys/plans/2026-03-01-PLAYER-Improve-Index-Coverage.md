#### 1. Context & Goal
- **Objective**: Improve unit test coverage for `index.ts`.
- **Trigger**: The domain has reached equilibrium with the README vision, so following the planner's journal fallback, we improve test stability. Current `index.ts` coverage is below optimal.
- **Impact**: Ensures robust, fully tested player core logic and prevents regressions.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/src/index.test.ts`]
- **Read-Only**: [`packages/player/src/index.ts`]

#### 3. Implementation Spec
- **Architecture**: Expand existing `vitest` unit tests in `index.test.ts`.
- **Pseudo-Code**:
  - Add test cases to cover missing branches and statements in `index.ts` (e.g., `getSchema`, getters, setters).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx vitest run --coverage packages/player/src/index.test.ts`
- **Success Criteria**: Vitest reports all tests pass with increased statement coverage for `index.ts`.
- **Edge Cases**: Ensure new mock state configurations do not break existing test paths.
