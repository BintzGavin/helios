---
id: PERF-637
slug: optimize-writer-waiter-resolve
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: "2024-05-31"
result: "kept"
---

# PERF-637: Optimize Writer Waiter Check in CaptureLoop Hot Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `runWorker` hot loop.

## Background Research
At the end of the `runWorker` loop, there is this check:
```typescript
            if (writerWaiterResolve && nextFrameToWrite === i) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```

Since we only have 1 concurrency in the microVM setup, checking `nextFrameToWrite === i` adds a redundant branch evaluation on every frame. When `poolLen` is 1, frames are processed strictly in order, so the writer is always waiting for the exact frame we just finished (if it is waiting at all).

Removing the `nextFrameToWrite === i` avoids V8 looking up that variable and evaluating the equality operator on the very hot execution path. The writer explicitly checks `frameReadyRing` when waking up anyway, so "early" wakeups (which won't happen when poolLen=1 anyway) are safe.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/output/example-build/composition.html
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.863s
- **Bottleneck analysis**: Micro-optimizations in the hot loop structure to remove branch checks.

## Implementation Spec

### Step 1: Remove condition in `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker`, change:
```typescript
            if (writerWaiterResolve && nextFrameToWrite === i) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```
to:
```typescript
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```

**Why**: Removes a redundant property lookup and branch check in the hot loop. V8 branch prediction can be simplified.
**Risk**: Writer might wake up slightly early if a later frame finishes before an earlier frame (only possible with >1 worker). However, the writer `while` loop checks `frameReadyRing` and immediately awaits again if it's not ready, so correctness is guaranteed.

## Variations
No variations planned.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts`.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	3.494	150	42.93	63.1	keep	baseline
2	2.468	150	60.78	63.9	keep	baseline
3	2.746	150	54.63	63.2	keep	baseline
4	2.695	150	55.66	63.1	keep	writerWaiterResolve optimization
5	2.514	150	59.66	63.0	keep	writerWaiterResolve optimization
6	2.499	150	60.03	62.9	keep	writerWaiterResolve optimization
```
