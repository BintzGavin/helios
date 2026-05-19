---
id: PERF-546
slug: disable-site-isolation
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-546: Disable Site Isolation in Chromium

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch arguments.

## Background Research
By default, Chromium enables strict site isolation (out-of-process iframes, etc.) for security. In our local, headless environment where we control the content and render offline frames, this security feature provides no benefit while adding significant IPC, memory, and CPU overhead by potentially spawning additional renderer processes or isolates for cross-origin resources. Passing `--disable-site-isolation-trials` and adding `IsolateOrigins,site-per-process` to the `--disable-features` flag removes this overhead, keeping all frames in the same process/isolate.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 51.645s
- **Bottleneck analysis**: IPC and process isolation overhead in Chromium.

## Implementation Spec

### Step 1: Append Disable Site Isolation Arguments
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Update the `--disable-features` flag in `DEFAULT_BROWSER_ARGS` to append `IsolateOrigins,site-per-process` and add `--disable-site-isolation-trials` to the array.
**Why**: Disabling site isolation reduces memory usage and cross-process communication overhead.
**Risk**: Minimal, as we operate in a trusted headless environment.

## Variations
None.

## Canvas Smoke Test
None.

## Correctness Check
Run the DOM render test suite (`npm run test -w packages/renderer -- --run`) to ensure it produces valid outputs without regressions.

## Prior Art
None.