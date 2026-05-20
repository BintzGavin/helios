---
id: PERF-551
slug: disable-logging
status: claimed
claimed_by: "executor-session"
created: 2026-05-20
completed: "2026-05-20"
result: "no-improvement"
---

# PERF-551: Disable Chromium Logging

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch arguments (Phase 1/4).

## Background Research
By default, Chromium generates internal diagnostic logs, warnings, and error messages that are piped to `stderr`. Playwright captures these streams. In our high-frequency, CPU-bound `--single-process` deterministic capture loop, the internal Chromium string formatting and IPC for standard error streams can cause unnecessary overhead. Disabling logging entirely via the `--disable-logging` and `--log-level=3` flags should eliminate this I/O and CPU waste, dedicating more resources to the hot frame loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, duration 10s (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: Wasted CPU cycles and stream IPC overhead for Chromium's internal background logging mechanisms in the microVM.

## Implementation Spec

### Step 1: Add `--disable-logging` and `--log-level=3` to Chromium arguments
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `DEFAULT_BROWSER_ARGS` array, append the following two strings:
`'--disable-logging'`,
`'--log-level=3'`
**Why**: Forces Chromium to suppress all non-fatal logging output, preventing string formatting and `stderr` IPC overhead from stealing CPU cycles from the main renderer thread.
**Risk**: If debugging lower-level Chromium crashes becomes necessary, these flags will hide the output. However, for deterministic rendering performance, it provides a cleaner execution environment.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run`

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to ensure DOM output is still correct and worker logic functions normally.

## Prior Art
PERF-542 successfully removed `--disable-dev-shm-usage` to reduce IPC overhead. Eliminating logging I/O is a similar strategy targeting communication overhead between Chromium and Node.js.

## Results Summary
- **Best render time**: 9.787s (vs baseline 9.908s) / Median: 10.148s (vs baseline 9.958s)
- **Improvement**: ~-1.9%
- **Kept experiments**: None
- **Discarded experiments**: Added `--disable-logging` and `--log-level=3` to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
