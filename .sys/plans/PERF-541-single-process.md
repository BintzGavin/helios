---
id: PERF-541
slug: single-process
status: complete
claimed_by: "Jules"
created: 2024-05-18
completed: "2024-05-18"
result: "keep"
---

# PERF-541: In-Memory Frame Encoding Optimization

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser launch arguments.

## Background Research
The `BrowserPool` creates a dedicated browser instance for each worker using `chromium.launch()`.
Chromium normally splits execution into a Main Browser Process and a Renderer Process (using IPC to communicate).
By passing `--single-process`, we force the renderer and the browser into the exact same OS process.
This completely eliminates Chromium's internal process-to-process IPC and shared memory brokering, which is safe since we have one dedicated Chromium instance per Node worker anyway.
Using `--single-process` drops the rendering time by avoiding inter-process communication overhead.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.760s
- **Bottleneck analysis**: IPC bottleneck in Chromium processes.

## Implementation Spec

### Step 1: Change to --single-process
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Change `--process-per-tab` to `--single-process` in `DEFAULT_BROWSER_ARGS`.
**Why**: Removes IPC between Chromium's Browser process and Renderer process.
**Risk**: None since we already have 1 browser per worker.

## Variations
None.

## Canvas Smoke Test
None.

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) to ensure it produces valid outputs without issues.

## Prior Art
None.
