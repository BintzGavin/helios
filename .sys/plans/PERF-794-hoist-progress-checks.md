---
id: PERF-794
slug: hoist-progress-checks
status: complete
claimed_by: "jules"
created: 2024-06-18
completed: 2026-06-18
result: "discarded"
---

# PERF-794: Hoist Progress Reporting Checks from Fast Path Loops

## Focus Area
`CaptureLoop.ts` frame capture fast paths (both single-worker and multi-worker).

## Background Research
Currently, inside the most deeply optimized section of the application—the `CaptureLoop.ts` fast-path loops—there are conditional checks evaluated on every single frame to report progress.
For example, in the single-worker path:
```typescript
if (i === nextProgressFrame) {
    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
    nextProgressFrame += progressInterval;
}
if (onProgress) {
    onProgress(i / totalFrames);
}
```
Evaluating these `if` conditions on every frame adds branch prediction pressure and minor but cumulative CPU overhead to the hot loop, interrupting V8's monomorphic optimization of the core time progression and stream writing sequence. By restructuring the loop to iterate in chunks of size `progressInterval`, we can evaluate these conditions strictly at chunk boundaries and keep the inner `for` loop fully unpolluted.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (baseline from earlier fast-path optimizations)
- **Bottleneck analysis**: The cost of evaluating conditional branching per frame adds micro-milliseconds. Eliminating these checks allows the core engine to focus purely on `setTime`, `capture`, and `stdin.write`.

## Implementation Spec

### Step 1: Chunked Loop in Single-Worker Fast Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, identify the block handling `hasProcessFn` and its `else` counterpart.
Refactor the `for` loops to operate in chunks:
```typescript
let currentFrame = 0;
while (currentFrame < totalFrames) {
    if (aborted || capturedErrors.length > 0) break;

    const endFrame = Math.min(currentFrame + progressInterval, totalFrames);

    // INNER LOOP: Pure processing, no progress checks
    for (let i = currentFrame; i < endFrame; i++) {
        if (aborted || capturedErrors.length > 0) break;
        await timeDriver.setTime(page, (startFrame + i) * compTimeStep);
        const buffer = strategy.processCaptureResult!(await strategy.capture(page, i * timeStep));

        if (stdin?.writable) {
            const canWriteMore = stdin.write(buffer as any);
            if (!canWriteMore && stdin.writableLength >= 16777216) {
                await this.drainPromise;
            }
        } else {
            console.warn('FFmpeg stdin is not writable. Skipping write.');
        }
    }

    currentFrame = endFrame;

    // OUTER LOOP: Report progress
    console.log(`Progress: Rendered ${currentFrame} / ${totalFrames} frames`);
    if (onProgress) {
        onProgress(currentFrame / totalFrames);
    }
}
```
Apply the same chunked looping structure to the `else` branch (where `!hasProcessFn`).
**Why**: Removes two unconditional `if` checks from the inner loop evaluated on every frame.
**Risk**: Progress reporting becomes slightly more staggered but structurally identical. Logic errors in chunk indices might skip frames.

### Step 2: Chunked Loop in Multi-Worker Writer Waiter Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path, the main writing thread pulls completed frames and does:
```typescript
if (currentFrame === nextProgressFrame) { ... }
if (onProgress) { ... }
```
Refactor this into a chunked `while` loop similar to Step 1.
**Why**: Extends the same branch elimination strategy to the multi-worker path.

## Results Summary
The experiment to chunk frames successfully completed its initial unit verification but deadlocked within the multi-worker loop under test constraints because the consumer code waits indefinitely for `writerWaiterPromise` when `progressInterval` batches fail to load asynchronously due to smaller thread pool capabilities. Thus, the implementation design was discarded. A simpler, safe alternative decoupling `onProgress` sequentially behind `if (currentFrame === nextProgressFrame)` was applied instead.

## Prior Art
- PERF-786 (simplify abort check) and PERF-776 (inline media sync check) successfully proved that removing conditionals from the `CaptureLoop.ts` fast path yields measurable benefits in median render times.
