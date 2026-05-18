---
id: PERF-543
slug: disable-dev-shm-usage
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-543: Remove --disable-dev-shm-usage Optimization

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch arguments.

## Background Research
Currently, `--disable-dev-shm-usage` is included in `DEFAULT_BROWSER_ARGS`. This forces Chromium to use `/tmp` instead of `/dev/shm` for shared memory. While often recommended for Docker environments with limited `/dev/shm` size, `/tmp` can be significantly slower than RAM-backed `/dev/shm` for IPC. In our CPU-bound microVM, if `/dev/shm` is sufficiently large (which `df -h /dev/shm` shows is 3.9G), removing this flag might allow Chromium to use faster RAM-backed shared memory for IPC and buffer transfers, potentially improving frame capture throughput.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~21.438s
- **Bottleneck analysis**: IPC bottleneck between Chromium and Playwright.

## Implementation Spec

### Step 1: Remove dev-shm-usage argument
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Remove `--disable-dev-shm-usage` from the `DEFAULT_BROWSER_ARGS` array.
**Why**: Allows Chromium to use faster `/dev/shm` shared memory instead of `/tmp`.
**Risk**: If `/dev/shm` is too small in the VM, the browser might crash.

## Variations
None.

## Canvas Smoke Test
None.

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
None.
