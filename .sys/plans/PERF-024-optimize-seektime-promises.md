---
id: PERF-024
slug: optimize-seektime-promises
status: complete
claimed_by: "jules"
created: 2026-03-21
completed: "2026-03-21"
result: "Keep: ~33.8s render time"
---

# PERF-024: Optimize SeekTimeDriver Promises and Callbacks

## Focus Area
The Frame Capture Loop (phase 4) in `packages/renderer/src/drivers/SeekTimeDriver.ts`. Specifically, optimizing the evaluation of the time seek script by dropping an unnecessary `requestAnimationFrame` wait.

## Background Research
During each frame capture in DOM mode, `SeekTimeDriver.setTime()` evaluates a global `__helios_seek` function. The function historically used `requestAnimationFrame` to ensure layout settling, but wait time has already been optimized down. We found that the final `await new Promise((resolve) => requestAnimationFrame(() => resolve()));` is completely unnecessary because:
1. The preceding logic (including `waitUntilStable` checks) already guarantees layout stability.
2. The extra `requestAnimationFrame` call introduces pure IPC and macro-task overhead, causing the Node process to wait an additional ~16.6ms per frame.

By eliminating this final `requestAnimationFrame` wait in `SeekTimeDriver`, we can shave a considerable amount of overhead per frame, resulting in faster end-to-end wall-clock render times.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition (`output/example-build/examples/simple-animation/composition.html`)
- **Render Settings**: 600x600, 30 fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.4s
- **Bottleneck analysis**: IPC and idle layout wait time imposed by `requestAnimationFrame`.

## Implementation Spec

### Step 1: Remove `requestAnimationFrame` from `__helios_seek`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string, inside `window.__helios_seek`:
Remove the final `await new Promise(...)` that wraps `requestAnimationFrame(() => resolve());`.
**Why**: Saves ~16.6ms of idle wait time per frame. Layout stability is already enforced by the earlier logic (e.g. `waitUntilStable` and media `seeked` events).
**Risk**: Very low. `waitUntilStable` handles the framework-specific stabilization.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-codecs.ts` to ensure nothing is broken.

## Correctness Check
Watch the output `.mp4` from `render-dom.ts` to ensure frames are properly timed and synchronized without tearing.

## Prior Art
- PERF-021: Dropped capture idle wait (removed nested rAF loops).
- PERF-023: Optimize SeekTimeDriver Evaluation Overhead.

## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|---|---|---|---|---|---|---|
| 1 | 34.071 | 150 | 4.40 | 0.0 | keep | baseline |
| 2 | 34.011 | 150 | 4.41 | 0.0 | keep | baseline |
| 3 | 34.348 | 150 | 4.37 | 0.0 | keep | baseline |
| 4 | 33.839 | 150 | 4.43 | 0.0 | keep | remove requestAnimationFrame |
| 5 | 33.787 | 150 | 4.44 | 0.0 | keep | remove requestAnimationFrame |
| 6 | 33.820 | 150 | 4.44 | 0.0 | keep | remove requestAnimationFrame |