---
id: PERF-708
slug: omit-catch-cdp-sync-media
status: complete
claimed_by: "executor-session"
created: 2024-06-08
completed: "2026-06-08"
result: "discarded"
---

# PERF-708: Omit .catch() in CdpTimeDriver defaultSyncMedia

## Focus Area
Frame Capture Loop (Time Driver execution phase).

## Background Research
`CdpTimeDriver.ts` contains a `defaultSyncMedia` method called on every frame when media is present. It sends CDP `Runtime.evaluate` commands to synchronize media elements. Currently, it appends `.catch(noopCatch)` to these promises. Appending `.catch()` implicitly returns a new Promise and allocates a closure and a microtask per frame. From prior successful experiments (e.g., PERF-706), eliminating unnecessary `.catch()` handlers on fatal/ignored CDP calls improves performance by reducing V8 promise chain allocation and GC overhead in the hot loop. The `noopCatch` explicitly silences errors, but we can likely just drop the `.catch` entirely, letting unhandled promise rejections bubble up if the CDP connection is truly broken.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-benchmark`
- **Render Settings**: 1920x1080, 60fps, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s (from previous experiments).
- **Bottleneck analysis**: Microtask and closure allocation overhead in the single-worker fast path. V8's JIT prefers smaller loops with fewer promise allocations.

## Implementation Spec

### Step 1: Remove `.catch(noopCatch)` and the `noopCatch` function.
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the line `const noopCatch = () => {};`.
2. In `defaultSyncMedia`, remove `.catch(noopCatch)` from all `this.client!.send('Runtime.evaluate', ...)` calls.
```typescript
<<<<<<< SEARCH
const noopCatch = () => {};

export class CdpTimeDriver implements TimeDriver {
=======
export class CdpTimeDriver implements TimeDriver {
>>>>>>> REPLACE
```
```typescript
<<<<<<< SEARCH
  private defaultSyncMedia() {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
    } else {
        if (this.executionContextIds.length > 0) {
          if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
            this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i] = {
                expression: "window.__helios_sync_media();",
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]).catch(noopCatch);
          }
        } else {
          this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
        }
    }
  }
=======
  private defaultSyncMedia() {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
    } else {
        if (this.executionContextIds.length > 0) {
          if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
            this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i] = {
                expression: "window.__helios_sync_media();",
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
          }
        } else {
          this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
        }
    }
  }
>>>>>>> REPLACE
```
**Why**: `Runtime.evaluate` returns a Promise. Appending `.catch(noopCatch)` forces V8 to allocate a new promise, a microtask, and hold a reference to `noopCatch` every frame. Removing it eliminates this per-frame allocation. Unhandled rejections from CDP (e.g., if the browser crashes) are usually fatal anyway, and this fits the headless render model where silent failure isn't desirable.
**Risk**: If harmless CDP errors occur during standard media sync (e.g., race conditions during page teardown), they might become unhandled promise rejections and crash the Node process.

## Canvas Smoke Test
`npm run test -w packages/renderer` - verify no breakages.

## Correctness Check
Run the DOM benchmark `npx tsx scripts/benchmark-perf.ts` and ensure the output `dom-benchmark.mp4` has smoothly synced media (if applicable) and doesn't crash prematurely.

## Results Summary
- **Best render time**: ~2.824s (vs baseline ~2.115s)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-708]
