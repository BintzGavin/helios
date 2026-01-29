# 2026-03-27 - RENDERER - CdpTimeDriver Stability Integration

## 1. Context & Goal
- **Objective**: Integrate `window.helios.waitUntilStable()` into `CdpTimeDriver` to ensure Canvas rendering respects custom stability checks.
- **Trigger**: Vision Gap - "Support Helios Stability Registry". `CanvasStrategy` (via `CdpTimeDriver`) currently ignores `waitUntilStable`, causing race conditions or missing data in custom renders.
- **Impact**: Enables robust, deterministic Canvas rendering for compositions that rely on the stability registry (e.g., waiting for data fetch, map load, or complex initialization).

## 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Add stability check logic)
- **Modify**: `packages/renderer/tests/run-all.ts` (Add verification script)
- **Create**: `packages/renderer/tests/verify-cdp-driver-stability.ts` (New test case)
- **Read-Only**: `packages/renderer/src/strategies/CanvasStrategy.ts`

## 3. Implementation Spec
- **Architecture**:
  - Update `CdpTimeDriver.setTime()` to perform a post-advancement stability check.
  - Use `page.evaluate()` to execute code within the browser context after the virtual time has been advanced.
  - The check must verify if `window.helios.waitUntilStable` is a function and `await` it.

- **Pseudo-Code (CdpTimeDriver.ts)**:
  ```typescript
  METHOD setTime(page, timeInSeconds):
    CALCULATE delta = timeInSeconds - this.currentTime

    IF delta > 0:
      CALCULATE budget = delta * 1000
      CALL client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget })
    END IF

    SET this.currentTime = timeInSeconds

    CALL page.evaluate(ASYNC () => {
      IF window.helios AND window.helios.waitUntilStable IS FUNCTION:
        AWAIT window.helios.waitUntilStable()
      END IF
    })
  END METHOD
  ```

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-cdp-driver-stability.ts`
- **Success Criteria**:
  - Test injects a mock `window.helios.waitUntilStable`.
  - Test calls `driver.setTime()`.
  - Test asserts that the mock function was called.
- **Edge Cases**:
  - `window.helios` is undefined (should not crash).
  - `waitUntilStable` is missing (should not crash).
  - `waitUntilStable` returns immediately.
