#### 1. Context & Goal
- **Objective**: Improve test coverage for the `packages/player` domain by testing missing cases in `bridge.ts` and `controllers.ts`.
- **Trigger**: `bridge.ts` and `controllers.ts` currently have lower code coverage because several `postMessage` handlers and controller methods (like `getSchema`, `diagnose`, `HELIOS_START_METERING`, etc.) are untested.
- **Impact**: Better stability and test suite completeness, preventing regressions in bridge communication.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/bridge.test.ts` (Add tests for `HELIOS_GET_SCHEMA`, `HELIOS_START_METERING`, `HELIOS_STOP_METERING`, `HELIOS_DIAGNOSE`)
  - `packages/player/src/controllers.test.ts` (Add tests for `getSchema`, `diagnose` in `BridgeController`)
  - `docs/status/PLAYER.md` (Update status)
- **Read-Only**:
  - `packages/player/src/bridge.ts`
  - `packages/player/src/controllers.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing `vitest` unit tests by mocking missing dependencies (like `AudioMeter` in `bridge.test.ts`) and adding new `it` blocks for the untested switch cases and `BridgeController` methods.
- **Pseudo-Code**:
  - In `bridge.test.ts`, mock `AudioMeter`.
  - Add tests triggering `HELIOS_GET_SCHEMA`, asserting `parentPostMessage` is called with `HELIOS_SCHEMA`.
  - Add tests triggering `HELIOS_START_METERING`, asserting `AudioMeter.connect` and `enable` are called.
  - Add tests triggering `HELIOS_STOP_METERING`, asserting `AudioMeter.disable` is called.
  - Add tests triggering `HELIOS_DIAGNOSE`, asserting `parentPostMessage` is called with `HELIOS_DIAGNOSE_RESULT`.
  - In `controllers.test.ts`, for `BridgeController`, add test for `getSchema()` asserting it posts `HELIOS_GET_SCHEMA` and resolves when it receives `HELIOS_SCHEMA`.
  - In `controllers.test.ts`, for `BridgeController`, add test for `diagnose()` asserting it posts `HELIOS_DIAGNOSE` and resolves when it receives `HELIOS_DIAGNOSE_RESULT`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player -- --coverage`
- **Success Criteria**: Coverage for `bridge.ts` and `controllers.ts` should improve, with lines like 118-150 in `bridge.ts` and 434-459 in `controllers.ts` becoming covered.
- **Edge Cases**:
  - Timeout behavior for `getSchema` and `diagnose` in `BridgeController` (resolving undefined or rejecting after 5000ms).
