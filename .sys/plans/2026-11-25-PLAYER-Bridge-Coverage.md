#### 1. Context & Goal
- **Objective**: Improve test coverage for `bridge.ts` to address unhandled coverage lines and stabilize the module.
- **Trigger**: The PLAYER domain has reached gravitational equilibrium with the documented vision. We must fall back to improving test coverage and documentation stability.
- **Impact**: Stabilizes the `bridge.ts` postMessage logic, reducing the risk of regressions in the iframe communication layer.

#### 2. File Inventory
- **Create**:
  - None
- **Modify**:
  - `packages/player/src/bridge_capture.test.ts` (Add tests to specifically target `handleCaptureFrame` logic for `dom` mode).
  - `packages/player/src/bridge.test.ts` (Add tests for unhandled postMessage branches like `HELIOS_SET_PROPS` and `HELIOS_SET_CAPTIONS`).
- **Read-Only**:
  - `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**: We will write unit tests using `vitest` for the `connectToParent` function and `handleCaptureFrame` logic within `bridge.ts`. We will simulate postMessage events to trigger uncovered switch branches.
- **Pseudo-Code**:
  - Dispatch message events to trigger uncovered switch branches such as `HELIOS_SET_PROPS`, `HELIOS_SET_CAPTIONS`, `HELIOS_SET_DURATION`, `HELIOS_SET_FPS`, `HELIOS_SET_SIZE`.
  - Dispatch capture frame requests and mock the `dom` mode outcomes.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npm install --no-save --workspaces=false && npx vitest run`
- **Success Criteria**: Tests pass and line coverage in `bridge.ts` improves significantly.
- **Edge Cases**: Ensure the test runner cleans up `window.addEventListener` listeners.