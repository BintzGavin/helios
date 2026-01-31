# Context & Goal
- **Objective**: Implement a configurable timeout for `CdpTimeDriver`'s stability check to prevent infinite hanging when user hooks fail to resolve.
- **Trigger**: `SeekTimeDriver` supports `stabilityTimeout`, but `CdpTimeDriver` (used in the default Canvas mode) awaits `window.helios.waitUntilStable()` indefinitely.
- **Impact**: Improves renderer robustness by ensuring the process recovers (continues rendering) even if a user's stability check hangs.

# File Inventory
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Add timeout logic to `setTime` script)
- **Modify**: `packages/renderer/src/index.ts` (Pass `stabilityTimeout` to `CdpTimeDriver` constructor)
- **Create**: `packages/renderer/tests/verify-cdp-driver-timeout.ts` (Verify timeout behavior)
- **Read-Only**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Reference implementation)

# Implementation Spec
- **Architecture**: Update `CdpTimeDriver` to accept a `timeout` in its constructor (defaulting to 30000ms). In `setTime`, inject a script that uses `Promise.race` between `window.helios.waitUntilStable()` and a `setTimeout` based on the configured value.
- **Pseudo-Code**:
  - `CdpTimeDriver` class:
    - Add property `private timeout: number`
    - Update `constructor(timeout: number = 30000)` to set `this.timeout`.
  - `setTime(page, time)`:
    - Update `stabilityScript` template string:
      - Accept `timeoutMs` as argument (along with `t` or separate).
      - Check if `window.helios.waitUntilStable` exists.
      - If exists:
        - Create `waitPromise = window.helios.waitUntilStable()`
        - Create `timeoutPromise = new Promise(resolve => setTimeout(resolve, timeoutMs))`
        - `await Promise.race([waitPromise, timeoutPromise])`
    - Pass `this.timeout` to the `page.evaluate` call.
- **Public API Changes**: None (internal driver change).
- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npx ts-node packages/renderer/tests/verify-cdp-driver-timeout.ts` (New test)
  - Run `npx ts-node packages/renderer/tests/verify-cdp-driver-stability.ts` (Regression test)
- **Success Criteria**:
  - The new test `verify-cdp-driver-timeout.ts` should inject a hanging `waitUntilStable` hook (e.g. `new Promise(() => {})`), call `driver.setTime`, and verify that it returns after the specified timeout (e.g. 1000ms).
  - The existing test `verify-cdp-driver-stability.ts` should pass without modification, confirming `waitUntilStable` is still awaited when it resolves quickly.
- **Edge Cases**:
  - Timeout is 0: `setTimeout(..., 0)` generally runs on next tick. It should return almost immediately.
  - `waitUntilStable` is missing: Script should skip awaiting and return immediately.
