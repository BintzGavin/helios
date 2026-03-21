---
id: PERF-023
slug: optimize-seektime-overhead
status: unclaimed
claimed_by: ""
created: 2026-03-21
completed: ""
result: ""
---

# PERF-023: Optimize SeekTimeDriver Evaluation Overhead

## Focus Area
The Frame Capture Loop (phase 4), specifically `SeekTimeDriver.setTime()` which dominates `dom` render time. During each frame capture, `setTime()` evaluates a globally injected `window.__helios_seek` function. However, the evaluation string allocates unnecessary arrays, Promises, callbacks and iterators inside tight loops (like `document.fonts.ready` waiting and `forEach` calls), adding significant V8 execution and GC overhead per frame in a CPU-bound microVM.

## Background Research
Every millisecond spent inside `page.evaluate()` translates directly to wall-clock render time delays per frame.
In `SeekTimeDriver`, on every single frame:
- It unconditionally checks and adds `document.fonts.ready` to the promises array. This only needs to happen once (e.g. at `t=0`).
- It iterates over DOM nodes using `.forEach` which is slower than a simple `for` loop and creates closure overhead.
- It unconditionally allocates `Promise.all(promises)` and `Promise.race([allReady, new Promise(setTimeout)])` even when the `promises` array is empty. For most frames, it is empty (since media rarely buffers during frame-by-frame seeking and fonts are already loaded).

Refactoring these to avoid allocations unless strictly necessary shaves off valuable milliseconds.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 600x600, 30 fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.4s
- **Bottleneck analysis**: CPU overhead from unnecessary object allocations (Promises, Arrays, closures) during the hot `__helios_seek` frame-capture loop.

## Implementation Spec

### Step 1: Optimize Array/Promise Allocations and Iterations in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Replace `.forEach` loops with standard `for` loops for both `cachedScopes` and `cachedMediaElements` to avoid closure allocations.
2. Modify the `1. Wait for Fonts` logic to only push `document.fonts.ready` when `t === 0`.
3. Wrap the `4. Wait for stability with a safety timeout` block in `if (promises.length > 0) { ... }` so it skips allocating `Promise.all`, `Promise.race`, and `setTimeout` entirely when there are no promises to wait for.
**Why**: Avoids creating closures, unnecessary `setTimeout` macros, and `Promise` objects on every frame, reducing V8 GC pressure and execution time.
**Risk**: Negligible. Font loading is already complete by `t > 0` and skipped promises are correctly avoided.

## Variations

### Variation A: Use a static empty promise
Instead of `if (promises.length > 0)`, provide an already resolved promise, though skipping execution is generally faster.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-codecs.ts` to ensure nothing is broken.

## Correctness Check
Watch the output `.mp4` from `render-dom.ts` to ensure frames are properly timed and synchronized.

## Prior Art
- PERF-022: Optimize Expensive DOM Scans in SeekTimeDriver (Caching DOM nodes)
- PERF-021: Dropped capture idle wait