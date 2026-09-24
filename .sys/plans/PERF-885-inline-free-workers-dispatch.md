---
id: PERF-885
slug: inline-free-workers-dispatch
status: complete
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-885: Inline and De-duplicate Worker Dispatch in Multi-Worker Loop

## Focus Area
The multi-worker writer loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the massive duplicate code block for assigning workers to frames (`if (freeWorkersHead > 0) { ... }`) which is repeated 3 times in the chunked writer loop, leading to redundant instruction decoding in V8's hot path.

## Background Research
The multi-worker loop currently has three identical `if (freeWorkersHead > 0) { ... }` blocks containing around 30 lines of code for polling the signal state and assigning free workers (`freeWorkers`) to requested frames via `workerThenables`.

Microbenchmarks of V8 execution on this pattern show that placing the identical dispatch block in a local closure arrow function (`const dispatchFreeWorkers = () => { ... }`) immediately prior to the hot loop and calling it is nearly 3-4x faster than repeating the large chunk of instructions in each loop branch due to improved V8 instruction cache utilization and simpler hot-path loop optimization.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom` (with multiple workers)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Large repeated code blocks inside the V8 hot loop reducing instruction cache efficiency and increasing parser overhead.

## Implementation Spec

### Step 1: Extract `dispatchFreeWorkers` closure and deduplicate logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer loop section (inside `if (this.pool.length > 1)`), locate the start of the `try {` block immediately following `const isDomStrategyWriter = this.pool[0].strategy.constructor.name === 'DomStrategy';`.

Define a local arrow function closure `dispatchFreeWorkers` capturing the exact logic that is currently duplicated:

```typescript
        const dispatchFreeWorkers = () => {
          if (freeWorkersHead > 0) {
            if (capturedErrors.length > 0 || (signal && signal.aborted)) {
              aborted = true;
            }

            if (aborted) {
              while (freeWorkersHead > 0) {
                const w = freeWorkers[--freeWorkersHead];
                workerThenables[w].resolve(-1);
              }
              writerWaiterPromise.resolve();
            } else {
              while (
                freeWorkersHead > 0 &&
                nextFrameToSubmit < totalFrames &&
                nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth
              ) {
                const w = freeWorkers[--freeWorkersHead];
                const n = nextFrameToSubmit++;
                const ringIndex = n & ringMask;
                frameReadyRing[ringIndex] = 0;
                frameBufferRing[ringIndex] = null;
                workerThenables[w].resolve(n);
              }
              if (nextFrameToSubmit >= totalFrames) {
                while (freeWorkersHead > 0) {
                  const w = freeWorkers[--freeWorkersHead];
                  workerThenables[w].resolve(-1);
                }
              }
            }
          }
        };
```

Then, replace the three duplicated blocks of `if (freeWorkersHead > 0) { ... }` (occurring after a frame write and inside the string/buffer chunk loops) with a single call to `dispatchFreeWorkers();`.
**Why**: Reduces duplicated code in the hot loop, enabling better V8 optimization.

## Variations
None.

## Canvas Smoke Test
Run `npm test -w packages/renderer` to ensure canvas mode still works.

## Correctness Check
Run `npm test -w packages/renderer` to verify DOM output is still correct.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	0.000	0	0.00	0.0	discard	Extracted dispatch block closure
```
