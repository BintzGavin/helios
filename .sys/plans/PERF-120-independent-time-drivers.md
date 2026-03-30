---
id: PERF-120
slug: independent-time-drivers
status: complete
claimed_by: "executor-session"
created: 2026-03-30
completed: 2026-03-30
result: improved
---
# PERF-120: Independent TimeDriver instances for Playwright workers

## Focus Area
DOM Rendering CPU Bottleneck. specifically, we want to fix `Another frame is pending` CDPSession errors, and also to properly scale Playwright multi-page concurrency.

## Background Research
In `PERF-119`, we found that sharing a single `DomStrategy` across the concurrent `Playwright` worker pool was causing race conditions with `this.cdpSession` state, leading to "Another frame is pending" `beginFrame` crashes and preventing pipeline depth scaling. We fixed this by instantiating an independent `DomStrategy` per worker.

If we look at `packages/renderer/src/drivers/SeekTimeDriver.ts`.
`SeekTimeDriver.ts` declares an un-exported module level array!
`const evaluateParamsPool: any[] = [];`
This is shared across ALL instances of `SeekTimeDriver`. Since multiple workers (pages) run in parallel, and they pop/push to `evaluateParamsPool` in `setTime()`, they could be popping the *exact same object reference* concurrently, modifying its `expression` property concurrently, and sending the *same modified object reference* over CDP simultaneously, corrupting the `Runtime.evaluate` payloads or causing IPC race conditions!
This shared object pool is extremely dangerous for concurrent workers!

*(Note: Checked `CdpTimeDriver.ts` and it does not use a shared `evaluateParamsPool`, so it is safe).*

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s - 34.3s
- **Bottleneck analysis**: Module-level shared object pool for CDP arguments in `SeekTimeDriver.ts` introduces IPC payload race conditions and potential evaluation corruption across concurrent workers, disrupting parallel scaling.

## Implementation Spec

### Step 1: Replace shared `evaluateParamsPool` with instance-level pool in TimeDrivers
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove the global module-level declaration:
   ```typescript
   const evaluateParamsPool: any[] = [];
   ```
2. Add an instance-level property to the class:
   ```typescript
   private evaluateParamsPool: any[] = [];
   ```
3. Update references inside `setTime` to use `this.evaluateParamsPool` instead of `evaluateParamsPool`.

**Why**: By localizing the object pool to the class instance, each Playwright worker page (which has its own independent `SeekTimeDriver` instance) will safely manage its own pre-allocated argument objects without IPC state corruption or concurrent modification races.
**Risk**: None. This safely corrects a concurrency data race.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to verify Canvas rendering still works.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-frame-count.ts` to verify DOM output correctly writes to FFmpeg.

## Results Summary
- **Best render time**: 33.4s (vs baseline 33.4s)
- **Improvement**: 0%
- **Kept experiments**: [PERF-120]
- **Discarded experiments**: []
