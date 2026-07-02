#### 1. Context & Goal
- **Objective**: Add unit tests for `usePersistentState` and `useKeyboardShortcut` hooks to achieve 100% test coverage.
- **Trigger**: File system exploration indicates `usePersistentState.ts` and `useKeyboardShortcut.ts` lack dedicated test files.
- **Impact**: Ensures hook robustness, particularly when interacting with restricted globals like `localStorage` or DOM `activeElement`.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/hooks/usePersistentState.test.ts` (Unit tests for `usePersistentState`)
  - `packages/studio/src/hooks/useKeyboardShortcut.test.ts` (Unit tests for `useKeyboardShortcut`)
- **Modify**: []
- **Read-Only**:
  - `packages/studio/src/hooks/usePersistentState.ts`
  - `packages/studio/src/hooks/useKeyboardShortcut.ts`

#### 3. Implementation Spec
- **Architecture**: Use `@testing-library/react` `renderHook` to mount the hooks and test their states/effects in isolation. Use `vitest` to spy on `console.warn`, mock `localStorage` methods, and manipulate `document.activeElement` to trigger error paths (e.g., `JSON.parse` exceptions or `isContentEditable` checks).
- **Pseudo-Code**:
  - For `usePersistentState`: Mock `localStorage.getItem` and `setItem`. Test initialization with/without existing values. Mock `localStorage` methods to throw an error, hitting the catch blocks and verifying the `console.warn` outputs.
  - For `useKeyboardShortcut`: Render the hook with `ignoreInput: true`. Mock `document.activeElement` to be a `contentEditable` element, fire a keyboard event, and assert the callback is NOT called.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Run `cd packages/studio && npx vitest run src/hooks/ --coverage`
- **Success Criteria**: Coverage for both `usePersistentState.ts` and `useKeyboardShortcut.ts` reaches 100%, and tests pass successfully.
- **Edge Cases**: `localStorage` being inaccessible (throws), invalid JSON in storage (throws), `contentEditable` elements correctly intercepting/ignoring shortcuts.
