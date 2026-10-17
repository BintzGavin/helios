#### 1. Context & Goal
- **Objective**: Improve unit test coverage for `ComponentsPanel.tsx` in `packages/studio`.
- **Trigger**: The current branch and statement coverage for `ComponentsPanel.tsx` is incomplete (65% branch, 83.87% statements), missing edge cases such as fetch error response parsing and confirmation rejection.
- **Impact**: Ensures reliability of the Component Registry UI by verifying error handling flows and preventing regressions, aligning with the strict 100% testing requirement.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/ComponentsPanel/ComponentsPanel.test.tsx`
- **Read-Only**: `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx`

#### 3. Implementation Spec
- **Architecture**: Standard React Testing Library test suite, mocking `fetch` responses and `window.confirm` dialogues.
- **Pseudo-Code**:
  - Add a test case for `handleInstall` where the `fetch` response is not `ok`, and the error body has no `.error` property (fallback to 'Installation failed' error).
  - Add a test case for `handleUpdate` where the `fetch` response is not `ok`, and the error body has no `.error` property.
  - Add a test case for `handleRemove` where the `fetch` response is not `ok`, and the error body has no `.error` property.
  - Add a test case for `handleRemove` where the user cancels the confirmation dialogue (`global.confirm` returns `false`), ensuring `fetch` is not called.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `cd packages/studio && npx vitest run src/components/ComponentsPanel/ComponentsPanel.test.tsx --coverage`.
- **Success Criteria**: 100% statement, branch, function, and line coverage reported for `ComponentsPanel.tsx`.
- **Edge Cases**: Empty error responses from API, user cancellation of dangerous actions.
