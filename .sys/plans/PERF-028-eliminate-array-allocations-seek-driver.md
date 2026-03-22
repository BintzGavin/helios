---
id: PERF-028
slug: eliminate-array-allocations-seek-driver
status: unclaimed
claimed_by: ""
created: 2026-03-22
completed: ""
result: ""
---

# PERF-028: Eliminate Array Allocations in CDPSession Frame Evaluation Loop

## Focus Area
The hot path in DOM rendering is `SeekTimeDriver.setTime()`, which iterates over `page.frames()` and calls either `Runtime.evaluate` via CDP or `frame.evaluate`. Currently, `frames.map` is used to create an array of promises on every single frame capture loop. When running with large page pools, this unnecessary array mapping inside the tightest I/O loop creates compounding garbage collection pressure and slight serialization delays.

## Background Research
Using array mapping followed by `Promise.all()` allocates a new array on every tick. This is inherently slower than using a pre-allocated array or standard loops. In a high-concurrency Node.js environment constantly context switching to serve Playwright IPC requests, minimizing allocations keeps V8's garbage collector from blocking the main thread.

## Benchmark Configuration
- **Composition URL**: `file:///app/packages/renderer/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.5s
- **Bottleneck analysis**: Heavy IPC string serialization and constant garbage collection allocation of arrays during `frames.map`.

## Implementation Spec

### Step 1: Optimize `frames` Iteration in `setTime`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Replace the `frames.map()` array allocation with a simple `for` loop that pushes promises to a localized array, or use a classic loop if possible.

Instead of mapping an array of frames directly to an array of promises with a callback, initialize an empty array of promises and write a standard C-style for loop iterating from index zero to the length of the frames array. Inside the loop, extract the individual frame using the index, evaluate the CDP or page frame logic, and push the returned promise into the localized promise array. Finish by awaiting all promises.

**Why**: Bypasses the callback overhead of mapping, prevents an implicit intermediate array, and reduces GC pressure in the `captureLoop`.
**Risk**: Very low. Standard loop optimization.

## Variations
### Variation A: Sequential `await`
If memory pressure from `Promise.all` buffering is an issue, we could test sequential iteration instead of parallelizing the evaluations.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-codecs.ts` (Canvas mode doesn't hit this path, but ensures no syntax regressions occur). Run a DOM render job via script.

## Correctness Check
Verify output DOM renders are still perfectly in sync.
