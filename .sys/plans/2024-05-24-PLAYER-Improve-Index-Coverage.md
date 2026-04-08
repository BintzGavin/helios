#### 1. Context & Goal
- **Objective**: Improve test coverage for `src/index.ts`.
- **Trigger**: The current statement coverage is 79.84%, with uncovered lines `3528,3533-3534`.
- **Impact**: Higher code quality and fewer regressions by testing uncovered edge cases.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.test.ts`
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Expand unit tests using vitest.
- **Pseudo-Code**:
  - Add a test for `handleExportClick` to cover the branch where `this.abortController` is defined, ensuring `this.abortController.abort()` is called.
  - Add a test for `handleExportClick` to cover the branch where `this.controller` is undefined, ensuring it logs the expected error.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cd packages/player && npx vitest src/index.test.ts --coverage`
- **Success Criteria**: Statement coverage for `src/index.ts` increases, specifically covering lines `3528,3533-3534`.
- **Edge Cases**: Verify `handleExportClick` gracefully handles cancellation and disconnected states.