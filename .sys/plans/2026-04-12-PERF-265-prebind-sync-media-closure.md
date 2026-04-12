---
id: PERF-265
slug: prebind-sync-media-closure
status: unclaimed
claimed_by: ""
created: 2026-04-12
completed: ""
result: ""
---

# 1. Context & Goal
The DOM Rendering Pipeline's `setTime` hot loop in `CdpTimeDriver.ts` currently allocates dynamic anonymous closure functions (i.e. `.catch(e => { ... })`) during `frame.evaluate` and `Runtime.callFunctionOn` when handling media synchronization across frames. The goal is to eliminate these continuous dynamic closure allocations per frame to reduce V8 GC pressure and optimize execution speed. Based on the performance journal, the current best render time is 0.276s.

# 2. File Inventory
- `packages/renderer/src/drivers/CdpTimeDriver.ts`

# 3. Implementation Spec
- **Architecture**: Introduce a pre-bound class property method to handle sync media errors, replacing the inline arrow functions in the hot loop.
- **Pseudo-Code**:
  ```typescript
  // Inside CdpTimeDriver class:
  private handleSyncMediaError = (e: any) => {
    console.warn('[CdpTimeDriver] Failed to sync media in frame:', e);
  };

  // In setTime method:
  if (frames.length === 1 && this.syncMediaParams.objectId) {
    this.syncMediaParams.arguments[0].value = timeInSeconds;
    await this.client!.send('Runtime.callFunctionOn', this.syncMediaParams).catch(this.handleSyncMediaError);
  } else {
    if (frames.length === 1) {
      await frames[0].evaluate(this.syncMediaClosure, timeInSeconds).catch(this.handleSyncMediaError);
    } else {
      if (this.cachedPromises.length !== frames.length) {
        this.cachedPromises = new Array(frames.length);
      }
      const framePromises = this.cachedPromises;
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        framePromises[i] = frame.evaluate(this.syncMediaClosure, timeInSeconds).catch(this.handleSyncMediaError);
      }
      await Promise.all(framePromises);
    }
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- Run `cd packages/renderer && npx tsx scripts/benchmark-test.js` to benchmark wall-clock render time and compare against the 0.276s baseline.
- Run `npx tsx tests/verify-dom-strategy-capture.ts` to verify DOM output is still correct.
