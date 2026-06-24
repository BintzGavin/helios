---
id: PERF-834
slug: unswitch-is-dom-strategy
status: unclaimed
claimed_by: ""
created: 2024-06-24
completed: ""
result: ""
---

# PERF-834: Unswitch isDomStrategy in CaptureLoop fast paths

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast paths (single and multi-worker loops)

## Background Research
Currently in `CaptureLoop.ts`, we evaluate `if (isDomStrategy)` per-frame inside the inner capture loops to extract specific types of capture promises. Since the strategy type is constant throughout the entire capture loop for a given execution, this check is redundant and introduces branch prediction overhead in the hottest code path.

By hoisting this check outside the frame loop and creating dedicated loops (one for `isDomStrategy === true` and one for `isDomStrategy === false`), we can eliminate this branch entirely from the inner loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock loop execution time in a microbenchmark

## Implementation Spec

### Step 1: Unswitch `isDomStrategy` in Single Worker Fast Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the single-worker path, split the main execution into two distinct branches based on `isDomStrategy` before the `if (hasProcessFn)` check. This means we will have an outer `if (isDomStrategy)` block with the full capture loop, and an `else` block with the identical loop but using the standard `strategy.capture()` logic instead of `domBeginFrame!()`.

### Step 2: Unswitch `isDomStrategy` in Multi Worker Fast Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the multi-worker path (`runWorker`), similarly unswitch `isDomStrategy` outside the `while (i < prefetchEnd)` frame loops.

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` to ensure no syntax or basic functional errors are introduced.

## Correctness Check
Run the DOM benchmark at `packages/renderer/scripts/benchmark-perf.ts --mode dom` to ensure frames are still captured correctly and no frames are dropped.
