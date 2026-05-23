---
id: PERF-574
slug: browser-pool-concurrency
status: complete
claimed_by: "executor-session"
created: 2024-06-15
completed: "2024-06-15"
result: "discarded"
---

# PERF-574: Increase BrowserPool Concurrency for DOM Strategy

## Focus Area
`BrowserPool.ts` concurrency initialization.

## Background Research
Currently, `BrowserPool.ts` calculates concurrency as `Math.max(1, (os.cpus().length || 4) - 1)`. In the headless microVM environment, `os.cpus().length` returns the number of physical/logical cores allocated. However, rendering DOM frames via Playwright CDP (`HeadlessExperimental.beginFrame`) is largely an IPC/I/O bound task rather than purely CPU bound. Much of the time is spent waiting on Chromium's compositor, IPC serializations, and Playwright's WebSocket roundtrips.

Because workers are I/O bound waiting for CDP, we can likely oversubscribe the CPU cores. If a microVM has 4 cores, the current calculation `(4 - 1)` spawns 3 workers. Increasing the concurrency multiplier (e.g., `(os.cpus().length || 4) * 2 - 1` or explicitly testing higher worker counts) might allow Node.js to overlap more IPC waits, increasing the total frame throughput piped to FFmpeg.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 150 frames, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.449s (microVM)
- **Bottleneck analysis**: Worker IPC and waiting on Playwright WebSocket CDP replies for `beginFrame` and `Runtime.evaluate`.

## Implementation Spec

### Step 1: Update BrowserPool Concurrency
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In `init()`, change the concurrency calculation:
```typescript
<<<<<<< SEARCH
    const concurrency = Math.max(1, (os.cpus().length || 4) - 1);
=======
    // Oversubscribe workers as CDP calls are largely I/O bound
    const concurrency = Math.max(1, (os.cpus().length || 4) * 2 - 1);
>>>>>>> REPLACE
```
**Why**: Increases the number of concurrent pages/strategies evaluating DOM frames, allowing better saturation of the Node.js event loop while waiting for Playwright IPC.
**Risk**: Might introduce CPU contention or Memory starvation if Chromium instances are too heavy, potentially causing Playwright/CDP timeouts or FFmpeg pipe starvation.

## Variations
If `* 2 - 1` causes regressions or crashes due to memory, try exactly `os.cpus().length` (e.g., 4 workers on a 4-core machine) or `* 1.5`.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to ensure rendering works correctly with higher concurrency. Run `npx tsx scripts/benchmark-perf.ts` to verify performance.

## Results Summary
- **Best render time**: 1.650s (vs baseline 1.368s)
- **Improvement**: Regressed
- **Kept experiments**: None
- **Discarded experiments**: `PERF-574 (os.cpus().length || 4) * 2 - 1`
