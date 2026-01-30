# Spec: Strict Virtual Time Synchronization in CdpTimeDriver

## 1. Context & Goal
- **Objective**: Ensure `CdpTimeDriver` waits for the virtual time budget to be fully consumed before proceeding, guaranteeing frame readiness.
- **Trigger**: Identified gap where `Emulation.setVirtualTimePolicy` returns immediately, potentially leading to race conditions in frame capture.
- **Impact**: Improves deterministic rendering reliability for heavy animations in Canvas mode.

## 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
- **Read-Only**: `packages/renderer/src/Renderer.ts`

## 3. Implementation Spec
- **Architecture**: Wrap `Emulation.setVirtualTimePolicy` in a Promise that resolves on `virtualTimeBudgetExpired` event.
- **Pseudo-Code**:
  ```typescript
  async setTime(page, timeInSeconds):
    delta = timeInSeconds - this.currentTime
    if delta <= 0 return

    // Sync media...

    budget = delta * 1000
    await new Promise(resolve => {
       // Use 'once' to avoid leaking listeners
       this.client.once('Emulation.virtualTimeBudgetExpired', resolve);
       this.client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget });
    });

    this.currentTime = timeInSeconds
    // ... stability checks ...
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts`.
- **Success Criteria**: The test completes successfully (exit code 0).
- **Edge Cases**: Verify that the browser doesn't hang indefinitely if budget never expires (shouldn't happen with 'advance').
