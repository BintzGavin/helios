#### 1. Context & Goal
- **Objective**: Improve unit test coverage for the Toast components in the Studio package, particularly `HotReloadToast`.
- **Trigger**: The recent addition of `HotReloadToast` component (STUDIO-Add-Hot-Reload-Indicator plan) did not include unit tests, creating a gap in our testing suite. We aim to reach 100% test coverage for the Toast components.
- **Impact**: Better stability and test coverage for the `packages/studio` codebase, preventing regressions when making future changes to hot reloading or toast functionality.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/Toast/HotReloadToast.test.tsx` - To test the hot reload indicator logic.
- **Modify**:
  - `packages/studio/src/components/Toast/ToastContainer.test.tsx` - If there are missing branches.
  - `packages/studio/src/components/Toast/Toast.test.tsx` - If there are missing branches.
- **Read-Only**:
  - `packages/studio/src/components/Toast/HotReloadToast.tsx`

#### 3. Implementation Spec
- **Architecture**: We'll create unit tests using Vitest and React Testing Library. For `HotReloadToast.test.tsx`, we need to mock `import.meta.hot.on` to trigger the `vite:beforeUpdate` event and verify that `addToast` is called. We must handle timer mocking (`vi.useFakeTimers()`) properly due to the debounce logic (`setTimeout`) inside `HotReloadToast.tsx`.
- **Pseudo-Code**:
  - `HotReloadToast.test.tsx`:
    - Mock `../../context/ToastContext` to provide a spy for `addToast`.
    - Setup mock for `import.meta.hot.on` that stores the handler callback.
    - Test case 1: Component renders nothing (returns `null`).
    - Test case 2: Triggers `vite:beforeUpdate`, advances timers, and asserts `addToast` was called with correct arguments.
    - Test case 3: Triggers `vite:beforeUpdate` rapidly multiple times, asserts `addToast` is only called once due to debouncing.
    - Test case 4: Verify unmount clears the timeout and cleans up.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage` and verify coverage metrics.
- **Success Criteria**: 100% test coverage for the files in `packages/studio/src/components/Toast/`.
- **Edge Cases**: Rapid consecutive hot module updates are properly debounced. Clean up on unmount works correctly.
