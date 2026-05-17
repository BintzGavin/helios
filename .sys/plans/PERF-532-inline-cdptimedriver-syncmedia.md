---
id: PERF-532
slug: inline-cdptimedriver-syncmedia
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-532: Inline CdpTimeDriver defaultSyncMedia into runSetTime

## Focus Area
DOM Rendering phase 4: Frame Capture Loop (`CdpTimeDriver.ts`).

## Background Research
Currently, `CdpTimeDriver.ts` has a hot loop method `runSetTime` which calls `this.defaultSyncMedia(timeInSeconds)`. `defaultSyncMedia` constructs and sends the CDP command for synchronizing media elements on the page. By moving this logic directly inside `runSetTime`, we can eliminate a function call overhead on every frame.

In JavaScript, particularly in highly optimized hot loops running hundreds or thousands of times, avoiding unnecessary function calls by inlining the logic directly can slightly reduce the call stack size and V8 compilation overhead, saving a few milliseconds across a long render.

## Benchmark Configuration
- **Composition URL**: `dom-benchmark`
- **Render Settings**: 1920x1080, 60fps, 10s duration (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.594s
- **Bottleneck analysis**: The V8 runtime execution overhead inside the main `CaptureLoop` -> `CdpTimeDriver.setTime` -> `runSetTime` path.

## Implementation Spec

### Step 1: Inline `defaultSyncMedia` in `runSetTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Move the contents of `defaultSyncMedia` directly into the `if (this.syncMediaState === 1)` block in `runSetTime()`.

```typescript
    // 1. Synchronize media elements
    if (this.syncMediaState === 1) {
      const frames = this.cachedFrames;
      if (frames.length === 1) {
        this.singleFrameSyncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
        this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
      } else {
          if (this.executionContextIds.length > 0) {
            const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
            if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
              this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
              for (let i = 0; i < this.executionContextIds.length; i++) {
                this.multiFrameSyncMediaParams[i] = {
                  expression: "",
                  contextId: this.executionContextIds[i],
                  awaitPromise: false,
                  returnByValue: false
                };
              }
            }
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i].expression = expression;
              this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]);
            }
          } else {
            this.singleFrameSyncMediaParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
            this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams);
          }
      }
    }
```
Delete the original `defaultSyncMedia` method from `CdpTimeDriver` class.

**Why**: Function inlining inside the hot loop reduces V8 call stack overhead. Since `defaultSyncMedia` is only called in one place (`runSetTime`), it should just be part of the main execution flow.

## Variations
None.

## Canvas Smoke Test
Run Canvas strategy to ensure it isn't broken.

## Correctness Check
Run the DOM render benchmark script (`npx tsx tests/fixtures/benchmark.ts`) to ensure it produces valid outputs without issues.

## Prior Art
- PERF-520: Inlined the stability check promise to remove closure and promise chain allocation.
