# 2026-06-25-STUDIO-Improve-ComponentsPanel-Coverage.md

## 1. Context & Goal
- **Objective**: Improve unit test coverage for the `ComponentsPanel` to handle missing API error edge cases and component removal error handling.
- **Trigger**: The Studio Architect Planner protocol instructed to identify gaps between vision and reality. While all functional features described in the vision appear to be implemented, maintaining code quality and rigorous test coverage for component registry UI (a key feature in V2) is necessary. The `ComponentsPanel.tsx` currently lacks coverage for several API failure edge cases during component removal (lines 99-100, 106-107).
- **Impact**: Full test coverage ensures robust error handling when interacting with the Component Registry API during removal processes, improving the Studio's stability.

## 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/ComponentsPanel/ComponentsPanel.test.tsx` (Add test cases to cover the remaining branches for `handleRemove` errors).
- **Read-Only**: `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx`

## 3. Implementation Spec
- **Architecture**: We will append additional test blocks to `ComponentsPanel.test.tsx` that simulate `fetch` returning a non-OK response (`ok: false`) or throwing an exception during the `DELETE` request in `handleRemove`.
- **Pseudo-Code**:
  1. Add a test case `it('handles API error on remove (not ok)', async () => { ... })` that intercepts the DELETE call and returns `ok: false, json: async () => ({ error: 'Removal failed' })`.
  2. Simulate a click on the "Remove" button and assert that the error toast is fired with 'Removal failed'.
  3. Add another test case `it('handles API exception on remove', async () => { ... })` that mocks `fetch` to throw a `new Error('Network error')` when calling the DELETE endpoint.
  4. Assert the fallback toast error message is correctly displayed.
- **Public API Changes**: None
- **Dependencies**: None

## 4. Test Plan
- **Verification**: Run the coverage script using `cd packages/studio && npx vitest run src/components/ComponentsPanel/ComponentsPanel.test.tsx --coverage`.
- **Success Criteria**: The coverage report for `ComponentsPanel.tsx` should reach 100% (or significantly close to it) and lines 99-100 and 106-107 should no longer be marked as uncovered.
- **Edge Cases**: Ensure the original mock setup and teardown effectively isolates these new fetch mocks without impacting other test assertions.
