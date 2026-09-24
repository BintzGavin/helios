#### 1. Context & Goal
- **Objective**: Improve test coverage for the `StudioContext.tsx` file to get it closer to 100%.
- **Trigger**: We've been working on improving the test coverage of components in the Studio package. `StudioContext.tsx` has significantly low branch/line coverage (around 47% line coverage).
- **Impact**: This will ensure that our core context logic handles edge cases and reduces bugs in state management for Studio features.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/studio/src/context/StudioContext.test.tsx` (Add more unit tests)
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`

#### 3. Implementation Spec
- **Architecture**: We'll add missing test scenarios using Vitest and React Testing Library, aiming to hit uncovered lines and functions within the `StudioProvider`.
- **Pseudo-Code**:
  - Add tests for `deleteRender` function block.
  - Add tests for `cancelRender` function block.
  - Add tests for `fetchAssets` block.
  - Add tests for `takeSnapshot` logic (both success and error paths).
  - Review remaining uncovered lines (from earlier `coverage` report: line 192-949) to systematically address branch paths.
- **Public API Changes**: none
- **Dependencies**: none

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage src/context/StudioContext.test.tsx`
- **Success Criteria**: The coverage for `StudioContext.tsx` should improve substantially (ideally above 80% line coverage).
- **Edge Cases**: We need to mock API fetch requests correctly for `fetchAssets`, `cancelRender`, `deleteRender` tests. Mock `captureFrame` logic on controller for `takeSnapshot`.
