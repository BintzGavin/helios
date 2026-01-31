#### 1. Context & Goal
- **Objective**: Implement unit tests for the `Stage` component to verify rendering, interaction (Zoom/Pan), and critical HMR state preservation logic.
- **Trigger**: Vision gap "Reliability" and "Hot Reloading" - ensuring the preview experience remains stable during development.
- **Impact**: Prevents regressions in the core preview component and ensures a smooth developer experience by validating state restoration.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/Stage/Stage.test.tsx`: Unit tests for the Stage component.
- **Modify**: None.
- **Read-Only**:
  - `packages/studio/src/components/Stage/Stage.tsx`: The component under test.
  - `packages/studio/src/context/StudioContext.tsx`: Context to mock.

#### 3. Implementation Spec
- **Architecture**:
  - Use `vitest` and `@testing-library/react`.
  - Mock `useStudio` via `vi.mock('../context/StudioContext')`.
  - Mock `<helios-player>` behavior by mocking the DOM element and `getController()` method.
- **Pseudo-Code**:
  - `describe('Stage', ...)`
    - `beforeEach`: Reset mocks.
    - `it('renders...')`: Render with `src`, check element exists.
    - `it('handles zoom...')`: Fire `wheel` event, check transform style.
    - `it('handles pan...')`: Fire `mousedown`, `mousemove`, check transform style.
    - `it('restores state on HMR...')`:
      - Mock `useFakeTimers`.
      - Render with initial controller.
      - Advance time to set `lastStateRef`.
      - Simulate "reload" by changing the mocked `getController` return value.
      - Advance time to trigger interval.
      - Verify `newController.seek`, `play`, `setInputProps` are called.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx vitest run packages/studio/src/components/Stage/Stage.test.tsx`
- **Success Criteria**: All tests pass, including HMR state restoration verification.
- **Edge Cases**:
  - Null controller.
  - Null src.
  - HMR with no previous state.
