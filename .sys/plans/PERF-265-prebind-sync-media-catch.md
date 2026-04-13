---
id: PERF-265
slug: prebind-sync-media-catch
status: unclaimed
claimed_by: ""
created: 2026-04-13
completed: ""
result: ""
---

# PERF-265: Pre-bind syncMedia catch handlers in CdpTimeDriver.ts

## 1. Context & Goal
DOM Rendering Pipeline - The `setTime` hot loop in `CdpTimeDriver.ts`. Specifically, eliminating the dynamic anonymous closures allocated per-frame for the `.catch` handlers during media synchronization.

In `CdpTimeDriver.setTime()`, we sync media before advancing time. For both `Runtime.callFunctionOn` and `frame.evaluate`, we attach a `.catch(e => { ... })` handler. Because `setTime()` is called on every frame, these anonymous arrow functions are instantiated repeatedly (e.g., thousands of times per render), increasing garbage collection pressure and reducing execution efficiency.

Previous experiments (e.g., PERF-252, PERF-261) have shown that pre-binding frequently allocated promise callbacks and error handlers to class properties yields measurable performance gains by avoiding dynamic allocation.

## 2. File Inventory
- `packages/renderer/src/drivers/CdpTimeDriver.ts`

## 3. Implementation Spec

- **Architecture**: We will replace inline anonymous arrow functions inside the `setTime` hot loop with a pre-bound instance property on the `CdpTimeDriver` class. This means the closure allocation only happens once when the class is instantiated, rather than per-frame.

- **Pseudo-Code**:
```typescript
class CdpTimeDriver {
  // ...
  private handleSyncMediaError = (e: any) => {
    console.warn('[CdpTimeDriver] Failed to sync media:', e);
  };
  // ...
  async setTime(page: Page, timeInSeconds: number) {
    // ...
    // From: await this.client!.send('Runtime.callFunctionOn', ...).catch(e => { ... });
    // To:
    await this.client!.send('Runtime.callFunctionOn', this.syncMediaParams).catch(this.handleSyncMediaError);
    // ...
    // From: await frames[0].evaluate(...).catch(e => { ... });
    // To:
    await frames[0].evaluate(this.syncMediaClosure, timeInSeconds).catch(this.handleSyncMediaError);
    // ...
  }
}
```

- **Public API Changes**: None.

- **Dependencies**: None.

## 4. Test Plan
- **Canvas Smoke Test**: Run `cd packages/renderer && npx tsx scripts/benchmark-test.js` to ensure the benchmark completes without errors.
- **Correctness Check**: Run the DOM rendering tests to verify frames are generated correctly and the pipeline completes.
