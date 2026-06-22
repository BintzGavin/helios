---
id: PERF-820
slug: unswitch-buffer-string-check
status: unclaimed
claimed_by: ""
created: 2024-06-22
completed: ""
result: ""
---

# PERF-820: Unswitch Buffer vs String Check in Capture Loop Fast Paths

## Focus Area
`CaptureLoop.ts` fast paths (single worker loop and multi-worker loop) FFmpeg write sequence.

## Background Research
Currently, inside the most deeply optimized section of the application—the `CaptureLoop.ts` fast-path loops—there is a conditional branch evaluated on every single frame to determine how to write the frame buffer to FFmpeg (`if (isString)`).

Because we have already established monomorphic frame data shapes in `DomStrategy` (PERF-807) and implemented static evaluation of `typeof buffer === 'string'` by checking only the first frame (PERF-808), `isString` is entirely static after the first frame of the sequence.

However, the inner loop still pays the penalty for a conditional branch on every iteration:
```typescript
if (isString) {
    // String processing logic
} else {
    // Buffer logic
}
```

By unswitching this loop, we can resolve the branch *once* outside the loop and execute an entire dedicated loop optimized solely for either String processing or Buffer processing. This eliminates the conditional jump instruction and branch prediction overhead entirely from the V8 hot loop, leading to tighter instruction packing.

Our microbenchmark verified this approach yielded a measurable optimization simply by unswitching the `isString` branch to dedicated loops. While small, this compounds across the entire frame sequence.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: Conditional branch overhead (`if (isString)`) evaluated on every frame inside the hottest loop, despite the condition being static.

## Implementation Spec

### Step 1: Unswitch the `hasProcessFn` Single-Worker Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the block `if (hasProcessFn)`. Right now, it does an initial setup for the first frame, loops through all frames, and evaluates `isString === null` and `if (isString)` per frame.

Refactor this block to handle the first frame specifically to determine `isString`, and then branch to two separate `for` loops.

### Step 2: Unswitch the `else` (No processFn) Single-Worker Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the identical unswitching refactor to the `else` branch of the single worker path (where `hasProcessFn` is false). Treat the first frame to determine `isString`, then branch to a string loop and a buffer loop.

### Step 3: Unswitch the Multi-Worker Write Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path, unswitch the `while (nextFrameToWrite < totalFrames && !aborted)` loop.
1. Await the first frame (`const buffer = await workerThenables[0]`).
2. Determine `isString`.
3. Process and write the first frame.
4. Branch into two dedicated `while` loops (one for Strings, one for Buffers) from `nextFrameToWrite = 1` up to `totalFrames`.

## Correctness Check
Run the `dom` mode benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts --mode dom` to verify that frame capturing and output generation remain completely intact without any corruption.
