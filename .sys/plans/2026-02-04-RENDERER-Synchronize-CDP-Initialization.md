# 2026-02-04-RENDERER-Synchronize-CDP-Initialization

## 1. Context & Goal
- **Objective**: Prevent initialization race conditions in `CdpTimeDriver` (Canvas Mode) by ensuring the application is ready before freezing virtual time.
- **Trigger**: Vision Gap identified - `SeekTimeDriver` (DOM Mode) waits for app initialization, but `CdpTimeDriver` pauses execution immediately, potentially freezing the app before it can initialize `window.helios`.
- **Impact**: Ensures deterministic rendering for apps that initialize asynchronously (e.g., inside `setTimeout` or `DOMContentLoaded`), aligning Canvas Mode robustness with DOM Mode.

## 2. File Inventory
- **Create**: `packages/renderer/tests/verify-cdp-initialization.ts` (Verification Test)
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Implementation)
- **Modify**: `packages/renderer/tests/run-all.ts` (Test Runner)
- **Read-Only**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Reference)

## 3. Implementation Spec
- **Architecture**:
  - Update `CdpTimeDriver.prepare` to inject a wait condition *before* issuing the CDP command to pause virtual time.
  - This ensures that any wall-clock dependent initialization logic in the page has time to execute before the clock is frozen.
  - The wait condition matches `SeekTimeDriver`: wait for `window.helios` OR `window.__helios_gsap_timeline__`.

- **Pseudo-Code (CdpTimeDriver.prepare)**:
  ```
  METHOD prepare(page)
    CALL page.context().newCDPSession(page) TO GET client

    TRY
      // Wait for app readiness (max 5 seconds)
      // Use page.waitForFunction with predicate checking window globals
      // Pass undefined as arg, and { timeout: 5000 } as options
      CALL page.waitForFunction(
        PREDICATE: return (window.helios defined OR window.__helios_gsap_timeline__ defined),
        ARG: undefined,
        OPTIONS: { timeout: 5000 }
      )
    CATCH
      // Ignore timeout (allow non-Helios pages to proceed)
    END TRY

    // NOW freeze time
    CALL client.send('Emulation.setVirtualTimePolicy', { policy: 'pause', ... })
    SET this.currentTime = 0
  END METHOD
  ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run the new verification script: `npx tsx packages/renderer/tests/verify-cdp-initialization.ts`
  - The test should inject a script that initializes `window.helios` after 500ms.
  - The test should fail if `CdpTimeDriver` pauses immediately (duration < 500ms, helios undefined).
  - The test should pass if `CdpTimeDriver` waits (duration >= 500ms, helios defined).
- **Success Criteria**: `verify-cdp-initialization.ts` outputs "✅ Passed: Driver waited for initialization."
- **Edge Cases**:
  - Static pages (no helios): Should proceed after 5s timeout (handled by try/catch).
  - Fast pages (immediate init): Should proceed immediately.
