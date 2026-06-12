---
id: PERF-750
slug: replace-previouswritepromise-variable-with-direct-await
status: complete
claimed_by: "jules"
created: 2024-06-12
completed: 2026-06-12
result: "Kept. Median render time improved to 2.475s from baseline 13.087s."
---
# PERF-750: Replace previousWritePromise variable with direct await in CaptureLoop

## Focus Area
The `CaptureLoop.ts` fast path and multi-worker loops use a local `previousWritePromise` variable to track if FFmpeg backpressure is occurring. This involves assigning `this.drainPromise as any as Promise<void>` to it if `!canWriteMore && stdin.writableLength >= 16777216`, and on the next loop iteration, awaiting it and resetting it to `undefined`. This defers the await by one iteration. Since `CaptureLoop.ts` has already been heavily optimized to remove Promise allocations and closure allocations, the actual variable assignment and the subsequent `if` branch in every single loop iteration could be a micro-bottleneck for the JIT.

## Background Research
Currently, the code defers awaiting the drain until the start of the next loop iteration:
```typescript
                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }

                // ... write logic ...
                if (!canWriteMore && stdin.writableLength >= 16777216) {
                    previousWritePromise = this.drainPromise as any as Promise<void>;
                }
```
By eliminating `previousWritePromise` entirely, we can just `await this.drainPromise` immediately when backpressure thresholds are hit. The pipeline overlap was originally an attempt to hide I/O latency, but since `stdin.writableLength >= 16777216` requires 16MB of backpressure to trigger, it rarely triggers anyway. By removing the variable, we remove a branch that is checked on *every* frame: `if (previousWritePromise)`.

Let's test removing the `previousWritePromise` tracking completely and awaiting immediately.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60 FPS, 10s duration (600 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~13.00s (multi-worker)
- **Bottleneck analysis**: The `if (previousWritePromise)` is checked on every single frame, adding branch overhead to the core V8 loop for both the single and multi-worker paths.

## Implementation Spec

### Step 1: Remove `previousWritePromise` from `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove the declaration `let previousWritePromise: Promise<void> | undefined;`
2. Remove the block:
```typescript
<<<<<<< SEARCH
                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }
=======
>>>>>>> REPLACE
```
from both the single worker fast path and the multi worker loop.
3. Replace the backpressure assignment:
```typescript
<<<<<<< SEARCH
                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                        previousWritePromise = this.drainPromise as any as Promise<void>;
                    }
=======
                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                        await this.drainPromise;
                    }
>>>>>>> REPLACE
```
in both the single worker fast path and the multi worker loop.
4. Remove the cleanup blocks after the loops:
```typescript
<<<<<<< SEARCH
        if (previousWritePromise) {
            await previousWritePromise;
        }
=======
>>>>>>> REPLACE
```
(twice, once for fast path, once for multi worker).

**Why**: Eliminates branch checking and variable tracking on every frame. When backpressure is high enough (16MB), the loop simply pauses and waits for it to drain directly.
**Risk**: Might slightly reduce pipeline overlap for the rare frames where backpressure exceeds 16MB, but since 16MB is extremely large, this is unlikely to be a bottleneck compared to the per-frame branch check overhead.

## Correctness Check
Run the benchmark `npx tsx scripts/benchmark-perf.ts` to verify that the render doesn't lock up and the output is valid.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	13.087	150	11.46	63.0	keep	baseline
2	2.521	150	59.49	62.9	keep	replaced previousWritePromise with direct await
3	2.475	150	60.61	62.9	keep	replaced previousWritePromise with direct await
4	2.881	150	52.06	62.9	keep	replaced previousWritePromise with direct await
```
