#### 1. Context & Goal
- **Objective**: Expand test coverage for `HeliosPlayer` controller edge cases, particularly focusing on methods and branches that currently lack tests to achieve 100% stability.
- **Trigger**: The PLAYER domain is in a "stable and feature complete" posture. The priority is now maximizing test coverage and resolving any untested edge cases (like unhandled errors or missing coverage in controller logic) to satisfy the regression fallback protocol described in `.jules/PLAYER.md`.
- **Impact**: Provides full confidence that `HeliosPlayer` behaves correctly under error states and edge cases, ensuring no regressions when shared dependencies update.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/controllers.test.ts`
- **Read-Only**: `packages/player/src/controllers.ts`, `README.md`

#### 3. Implementation Spec
- **Architecture**:
  - Add specific unit tests to `packages/player/src/controllers.test.ts` targeting lines that `vitest --coverage` identified as uncovered.
  - Test the `captureFrame` logic in `DirectController` when `options?.mode !== 'dom'` and the element is not a canvas.
- **Pseudo-Code**:
  - In `describe('DirectController')`, define a test case 'should return null if element is not a CANVAS'.
  - Mock `document.querySelector` to return an element that is NOT a canvas element (e.g., `tagName === 'DIV'`).
  - Call `controller.captureFrame(10, { mode: 'canvas' })`
  - Assert that the function resolves to `null`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player -- --coverage`
- **Success Criteria**: Overall coverage percentage for `controllers.ts` should improve, specifically targeting branches and lines previously untested.
- **Edge Cases**: Ensure simulated errors and promises correctly reject without causing unhandled promise rejections in the Node.js test environment.