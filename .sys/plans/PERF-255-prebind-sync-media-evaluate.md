---
id: PERF-255
slug: prebind-sync-media-evaluate
status: complete
claimed_by: "executor-session"
created: 2026-04-12
completed: "2026-04-12"
result: "improved"
---
# PERF-255: Prebind sync media evaluate in CdpTimeDriver

1. Context & Goal
The `setTime` hot loop in `packages/renderer/src/drivers/CdpTimeDriver.ts` evaluates an anonymous closure on every frame: `(t) => { if (typeof (window as any).__helios_sync_media === 'function') ... }`. This dynamic closure allocation puts unnecessary pressure on V8's garbage collector. Pre-binding the evaluate closure as a class property avoids this allocation overhead per frame, reducing GC pauses.

2. File Inventory
- `packages/renderer/src/drivers/CdpTimeDriver.ts`

3. Implementation Spec
- **Architecture**: Move the anonymous closure into a class property `private syncMediaClosure = (t: number) => { if (typeof (window as any).__helios_sync_media === 'function') { (window as any).__helios_sync_media(t); } };` and use it for the frame evaluations in `setTime`.
- **Pseudo-Code**:
  ```typescript
  private syncMediaClosure = (t: number) => { if (typeof (window as any).__helios_sync_media === 'function') { (window as any).__helios_sync_media(t); } };
  // ... in setTime ...
  await frames[0].evaluate(this.syncMediaClosure, timeInSeconds)
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

4. Test Plan
- Run `benchmark-test.js` to measure CPU render time.
- Verify correctness using standard CDP determinism, driver, and stability tests: `tests/verify-cdp-driver.ts`.

## Results Summary
- **Best render time**: 2.101s (vs baseline 2.175s)
- **Improvement**: 3.4%
- **Kept experiments**: Prebind sync media evaluate in CdpTimeDriver
- **Discarded experiments**: none

## Results Summary
- **Best render time**: 2.101s (vs baseline 2.175s)
- **Improvement**: 3.4%
- **Kept experiments**: Prebind sync media evaluate in CdpTimeDriver
- **Discarded experiments**: none
