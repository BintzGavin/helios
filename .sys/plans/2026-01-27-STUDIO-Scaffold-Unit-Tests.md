# Plan: Scaffold Studio Unit Tests

## 1. Context & Goal
- **Objective**: Establish a unit testing infrastructure for `packages/studio` and implement initial tests for the Timeline component.
- **Trigger**: The Studio domain currently lacks any unit tests ("Testability is mandatory"), leaving UI logic vulnerable to regressions.
- **Impact**: Enables safe refactoring and feature addition for Studio UI. Ensures critical logic (like timeline clamping) works as expected.

## 2. File Inventory
- **Create**:
    - `packages/studio/vitest.config.ts`: Test configuration file.
    - `packages/studio/src/components/Timeline.test.tsx`: Initial test suite for the Timeline component.
- **Modify**:
    - `packages/studio/package.json`: Add testing dependencies and scripts.
- **Read-Only**:
    - `packages/studio/src/components/Timeline.tsx`: Component under test.
    - `packages/studio/src/context/StudioContext.tsx`: Context definition for mocking.

## 3. Implementation Spec
- **Architecture**:
    - **Runner**: Vitest (consistent with monorepo root).
    - **Environment**: jsdom (simulates DOM for React).
    - **Testing Library**: `@testing-library/react` for component integration testing.
    - **Mocking**: Isolate components by mocking the `useStudio` hook to provide controlled `PlayerState` and `HeliosController` stubs.

- **Dependencies**:
    - `vitest` (dev)
    - `jsdom` (dev)
    - `@testing-library/react` (dev)

- **Execution Steps**:
    1.  Update `packages/studio/package.json`:
        -   Add `vitest`, `jsdom`, and `@testing-library/react` to `devDependencies`.
        -   Add `"test": "vitest"` to `scripts`.
    2.  Create `packages/studio/vitest.config.ts`:
        -   Configure `test.environment` to `'jsdom'`.
        -   Ensure `test.globals` is true (optional, but convenient).
        -   Configure setup files if necessary (e.g., for `cleanup`).
    3.  Create `packages/studio/src/components/Timeline.test.tsx`:
        -   Import `render`, `screen`, `fireEvent`.
        -   `vi.mock('../context/StudioContext')`.
        -   Test Case 1: Renders correct current time and duration.
        -   Test Case 2: Renders In/Out markers at correct positions.
        -   Test Case 3: Calls `controller.seek` when clicking playhead track.
        -   Test Case 4: Clamps In point so it cannot exceed Out point (via mock state update check or spy).

## 4. Test Plan
- **Verification**:
    - Run `npm install` in the root (to link new workspace dependencies).
    - Run `npm test -w packages/studio`.
- **Success Criteria**:
    - Vitest output shows green for `Timeline.test.tsx`.
    - All 4 test cases pass.
- **Edge Cases**:
    - `totalFrames` being 0 (division by zero handling in Timeline).
    - Dragging markers beyond bounds (0 or duration).
