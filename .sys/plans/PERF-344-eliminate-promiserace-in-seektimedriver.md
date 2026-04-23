---
id: PERF-344
slug: eliminate-promiserace-in-seektimedriver
status: complete
claimed_by: ""
created: 2025-02-23
completed: ""
result: ""
---

# PERF-344: Eliminate Promise.race Array Allocation in SeekTimeDriver

## Focus Area
`SeekTimeDriver.ts` single-frame execution hot path, specifically the stability check timeout logic inside the injected `window.__helios_seek` script.

## Background Research
During single-frame evaluation within the capture loop when using `SeekTimeDriver`, the injected script `window.__helios_seek` uses `Promise.race([allReady, timeoutPromise])` to wait for media/fonts/stability with a safety timeout. Every execution of `Promise.race` allocates a new Array to hold the promises, a new internal Promise for the race itself, and the inline `.then` allocates another closure. This causes unnecessary garbage collection pressure per frame. Similar to PERF-343 which eliminated this in `CdpTimeDriver`, we can manually implement the race logic to avoid the `[allReady, timeoutPromise]` array literal allocation and the internal Promise wrapping overhead of `Promise.race()`.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A
- **Bottleneck analysis**: Repeated array and Promise allocations from `Promise.race` inside the hot loop inside the `window.__helios_seek` browser execution context add unnecessary garbage collection pressure per frame.

## Implementation Spec

### Step 1: Eliminate `Promise.race` in injected script
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string, inside `window.__helios_seek`:
1. Find `const allReady = Promise.all(promises);` and `const timeoutPromise = new Promise(...)`.
2. Find `return Promise.race([allReady, timeoutPromise]).then(() => { ... })`.
3. Replace this with a new `Promise` constructor that wraps `Promise.all(promises).then(...)` and `setTimeout(...)` to manually resolve, avoiding the `[]` array literal allocation and `Promise.race` overhead.

Example logic:
```javascript
          if (promises && promises.length > 0) {
            return new Promise((resolve) => {
              let timeoutId = setTimeout(() => {
                finish();
              }, timeoutMs);

              let isDone = false;
              const finish = () => {
                if (isDone) return;
                isDone = true;
                clearTimeout(timeoutId);

                // 5. After stability, ensure GSAP timelines are seeked again...
                // ... same as before ...

                resolve();
              };

              Promise.all(promises).then(finish);
            });
          }
```
**Why**: Avoids dynamic array allocation and the internal Promise wrapping overhead of `Promise.race()` inside the browser context for every frame.
**Risk**: Requires careful state tracking (`isDone`) to ensure timeouts clear correctly and the logic only executes once.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`

## Prior Art
- PERF-343 (Eliminate Promise.race Array Allocation in CdpTimeDriver)
## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|---|---|---|---|---|---|---|
| 1 | 47.183 | 600 | 12.72 | 41.4 | discard | eliminate promiserace array allocation in SeekTimeDriver (within noise margin, negligible improvement) |
