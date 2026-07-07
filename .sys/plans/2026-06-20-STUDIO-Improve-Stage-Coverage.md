#### 1. Context & Goal
- **Objective**: Improve the test coverage for the `Stage` component to 100%.
- **Trigger**: The recent coverage report shows lines 135-136 and 190-196 in `Stage.tsx` are uncovered, which correspond to toolbar callback functions.
- **Impact**: Ensures that user interactions via the toolbar (fitting the view, toggling transparency, toggling guides, and opening settings) correctly update state and call context methods, improving reliability.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/studio/src/components/Stage/Stage.test.tsx`
- **Read-Only**: `packages/studio/src/components/Stage/Stage.tsx`

#### 3. Implementation Spec
- **Architecture**: Simulate the callback props triggered by `StageToolbar` within the test environment to execute the uncovered inline arrow functions and the `handleFit` method.
- **Pseudo-Code**:
  - Update the `StageToolbar` mock in `Stage.test.tsx` to render clickable buttons for the missing callbacks (`onFit`, `onToggleTransparent`, `onToggleGuides`, `onOpenSettings`).
  - Add a new test case (`it('handles toolbar actions')`) that:
    - Renders `<Stage src="test.js" />`.
    - Simulates click events on the mocked `onFit`, `onToggleTransparent`, `onToggleGuides`, and `onOpenSettings` buttons.
    - Asserts that the correct context functions were called (e.g., `mockSetSettingsOpen(true)`) and states updated appropriately.
- **Public API Changes**: none
- **Dependencies**: none

#### 4. Test Plan
- **Verification**: `npm run test -w packages/studio -- src/components/Stage/Stage.test.tsx --coverage`
- **Success Criteria**: 100% test coverage reported for `Stage.tsx`.
- **Edge Cases**: Verify that toggling state correctly passes inverted boolean values or triggers the appropriate handler.
