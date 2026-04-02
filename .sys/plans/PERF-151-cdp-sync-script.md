---
id: PERF-151
slug: cdp-sync-script
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-151: Pre-compile CdpTimeDriver.ts Time Sync Script

## Focus Area
The DOM pipeline's hot capture loop, specifically the frame evaluation mechanism in `CdpTimeDriver.ts`. The `page.evaluate()` call used to wait for stability triggers a new function allocation and string conversion in Node/Playwright. We can optimize this by using a CDP call with a pre-allocated parameter object.

## Background Research
The `docs/status/RENDERER-EXPERIMENTS.md` journal states that `SeekTimeDriver.ts` was optimized under `PERF-017` and `PERF-018` by moving evaluation scripts into initialization steps and directly using CDP for the hot loop instead of Playwright's `page.evaluate` abstraction. Currently, `CdpTimeDriver.ts` uses `page.evaluate(() => { ... })` for stability checks. By pre-allocating the CDP parameters (`{ expression: 'if (typeof (window).__helios_wait_until_stable === "function") return (window).__helios_wait_until_stable();', awaitPromise: true, returnByValue: false }`) and calling `this.client!.send('Runtime.evaluate', ...)` directly, we avoid the Playwright `page.evaluate` overhead and closure allocations per frame.

## Benchmark Configuration
- **Composition URL**: `http://example.com`
- **Render Settings**: 1280x720, 30fps, duration 30s (900 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~43.2s (43265ms, 900 frames, from local benchmark `test-perf-baseline2.ts`)
- **Bottleneck analysis**: Playwright's `page.evaluate` closure allocation and internal stringification overhead inside `CdpTimeDriver.ts`'s `setTime()` method.

## Implementation Spec

### Step 1: Pre-allocate CDP evaluate parameters
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a class property:
`private evaluateParams = { expression: 'if (typeof (window).__helios_wait_until_stable === "function") return (window).__helios_wait_until_stable();', awaitPromise: true, returnByValue: false };`

**Why**: This avoids re-creating the object and string evaluation on every frame.

### Step 2: Use direct CDP call for stability check
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `setTime` method, replace:
```javascript
        page.evaluate(() => {
          if (typeof (window as any).__helios_wait_until_stable === 'function') {
            return (window as any).__helios_wait_until_stable();
          }
        }),
```
with:
`this.client!.send('Runtime.evaluate', this.evaluateParams),`

**Why**: Bypasses the `page.evaluate` abstraction and closure allocation, mirroring the optimization in `SeekTimeDriver.ts`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to verify the time driver and media syncing.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` or a similar script in `canvas` mode to ensure the canvas path operates correctly.
