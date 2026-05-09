---
id: PERF-466
slug: bypass-await-stability-check
status: complete
claimed_by: ""
created: 2024-05-09
completed: ""
result: ""
---

# PERF-466: Conditionally Bypassing Await for Stability Check

## Focus Area
Frame Capture Loop (Phase 4), specifically `CdpTimeDriver.runSetTime()`.

## Background Research
Currently, `runSetTime` uses `await this.stabilityCheckFn();` unconditionally. However, for the vast majority of frames in projects without a custom stability function, `this.stabilityCheckFn` is assigned a no-op function `() => {}` via `PERF-461`.
Awaiting a function that returns `void` (or `undefined`) still forces V8 to yield execution and queue a microtask, adding measurable overhead in a hot loop that runs thousands of times.
A standalone benchmark over 150,000 iterations shows that explicitly checking for a Promise before awaiting is significantly faster:
- `await fn()`: ~21.1ms
- `const res = fn(); if (res instanceof Promise) await res;`: ~3.2ms

## Benchmark Configuration
- **Composition URL**: Default `dom-benchmark` composition
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.02s
- **Bottleneck analysis**: Microtask queueing overhead introduced by unconditionally awaiting a synchronous no-op function inside the `runSetTime` hot loop.

## Implementation Spec

### Step 1: Conditionally await `stabilityCheckFn` in `CdpTimeDriver`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Inside `runSetTime`, replace `await this.stabilityCheckFn();` with:
```typescript
    // Wait for custom stability checks
    const stabilityRes = this.stabilityCheckFn();
    if (stabilityRes instanceof Promise) {
        await stabilityRes;
    }
```
**Why**: If `stabilityCheckFn` is a no-op, it returns `undefined`. By checking if it's a Promise before awaiting, we avoid yielding execution and queuing a microtask, speeding up the hot loop.
**Risk**: Negligible.

## Variations
None.

## Canvas Smoke Test
Run `npm run build:examples && npx tsx packages/renderer/scripts/render-dom.ts` to verify nothing is fundamentally broken.

## Correctness Check
Run `npm run build:examples && npx tsx packages/renderer/scripts/render-dom.ts` and verify the output `packages/renderer/output/dom-animation.mp4` renders successfully and looks correct visually.
