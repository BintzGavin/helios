---
id: PERF-548
slug: remove-synchronous-threading-flags
status: unclaimed
claimed_by: ""
created: 2024-05-19
completed: ""
result: ""
---

# PERF-548: Remove Synchronous Threading Flags in Single-Process Mode

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Chromium launch arguments.

## Background Research
Currently, `DEFAULT_BROWSER_ARGS` includes a block of flags (`--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, `--disable-image-animation-resync`, `--disable-smooth-scrolling`) that force Chromium to execute animations, scrolling, and image decoding synchronously on the main thread.

Historically, this was used to improve determinism or reduce IPC overhead in multi-process headless mode. However, in our new `--single-process` architecture (PERF-541), forcing everything onto the single main thread creates a bottleneck. By removing these flags, Chromium can utilize its internal threading model to offload animations and image decoding to background threads within the single process, taking advantage of multi-core availability in the microVM.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: The single main thread in `--single-process` mode handles all V8 execution, layout, and rendering synchronously, leaving other CPU cores underutilized.

## Implementation Spec

### Step 1: Remove Synchronous Threading Flags
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Remove the following flags from the `DEFAULT_BROWSER_ARGS` array:
- `'--disable-threaded-animation'`
- `'--disable-threaded-scrolling'`
- `'--disable-checker-imaging'`
- `'--disable-image-animation-resync'`
- `'--disable-smooth-scrolling'`

**Why**: Allows the single Chromium process to offload animation computation and image decoding to background threads, relieving the main V8 thread and improving multi-core utilization.
**Risk**: Might introduce non-determinism if the compositor doesn't wait for these threads, though the `--run-all-compositor-stages-before-draw` flag should safeguard against this by ensuring the compositor waits for all stages before capturing the frame.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure the Canvas path still works and tests pass.

## Correctness Check
Run the full test suite (`npm run test -w packages/renderer -- --run`) to verify that removing these flags does not break deterministic rendering or cause frame synchronization regressions.

## Prior Art
- PERF-541: In-Memory Frame Encoding Optimization (`--single-process`) which made the process single-threaded from an OS perspective, increasing the value of internal thread utilization.

## Results Summary
- **Best render time**: 10.676s (vs baseline ~10.002s)
- **Improvement**: -6.7% (Regression)
- **Kept experiments**: []
- **Discarded experiments**: [Step 1: Remove Synchronous Threading Flags]
