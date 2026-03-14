#### 1. Context & Goal
- **Objective**: Improve test coverage for the `bridge.ts` file in the `packages/player` domain.
- **Trigger**: The domain has reached gravitational equilibrium, and the current goal is to improve test coverage and documentation stability.
- **Impact**: Increased test coverage for error handlers and DOM capture logic will prevent future regressions and ensure the bridge module correctly handles and reports failures.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/bridge_capture.test.ts` (Add tests for uncovered lines in `bridge.ts`)
- **Read-Only**: `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**: We will add tests to `bridge_capture.test.ts` to verify the uncovered lines in `bridge.ts` (173, 186, 210-227).
  - Lines 170-176 (approx): Global error handler (`window.addEventListener('error')`).
  - Lines 184-190 (approx): Unhandled rejection handler (`window.addEventListener('unhandledrejection')`).
  - Lines 210-227: The DOM mode frame capture logic in `handleCaptureFrame`.
- **Pseudo-Code**:
  - In `bridge_capture.test.ts`, we'll dispatch an `ErrorEvent` and verify `postMessage` is called with `type: 'HELIOS_ERROR'`.
  - We'll dispatch a `PromiseRejectionEvent` and verify `postMessage` is called with `type: 'HELIOS_ERROR'`.
  - We'll test `HELIOS_CAPTURE_FRAME` with `mode: 'dom'`, mock `captureDomToBitmap` to resolve successfully, and check for the `HELIOS_FRAME_DATA` response with `success: true`.
  - We'll test `HELIOS_CAPTURE_FRAME` with `mode: 'dom'`, mock `captureDomToBitmap` to reject, and check for the `HELIOS_FRAME_DATA` response with `success: false`.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cd packages/player && npm run test -- --coverage`
- **Success Criteria**: Coverage for `src/bridge.ts` improves significantly, specifically covering the global error handlers and DOM mode capture logic.
- **Edge Cases**: Verify that errors thrown from `captureDomToBitmap` correctly send a failure message without crashing the iframe.