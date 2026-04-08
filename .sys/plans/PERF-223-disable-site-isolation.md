---
id: PERF-223
slug: disable-site-isolation
status: unclaimed
claimed_by: ""
created: 2024-06-02
completed: ""
result: ""
---

# PERF-223: Disable Site Isolation in Chromium

## Focus Area
DOM Rendering Pipeline - Chromium Process Scheduling overhead in `BrowserPool.ts`.

## Background Research
Chromium utilizes multiple OS processes to isolate sites for security. While `PERF-196` restored the `--process-per-tab` argument to attempt better parallelization, the default overhead of these processes and memory fragmentation can become a detriment in memory and cpu restricted virtualized environments. Re-disabling the `site-per-process` arguments alongside removing `process-per-tab` will consolidate memory overhead, potentially yielding a significant render speed up for our isolated rendering environments where trusted compositions are used.

We will remove the `--process-per-tab` flag, and instead add `--disable-site-isolation-trials` and `--disable-features=IsolateOrigins,site-per-process` back into the Chromium execution pipeline arguments inside `BrowserPool.ts`. This was previously tested but dropped due to concerns over worker concurrency. We will formally benchmark this combination once again.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.983s (with recent updates making it slower, historically ~32.767s)
- **Bottleneck analysis**: IPC overhead and Context-Switching for multiple renderer processes.

## Implementation Spec

### Step 1: Update flags in `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Remove `'--process-per-tab'`
Add `'--disable-site-isolation-trials'` and `'--disable-features=IsolateOrigins,site-per-process'`
**Why**: Single-Process-ish rendering reduces IPC context switching on low-core CPU's, increasing execution speed.
**Risk**: If Playwright pages lock main thread, it could degrade performance instead. We rely on the benchmark to evaluate.

## Correctness Check
Run the DOM render benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to ensure no functionality is broken.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/run-all.ts` to verify the Canvas path is unharmed.

## Prior Art
PERF-196, PERF-158 optimize renderer scheduling and compositing overhead via Chromium flags.
