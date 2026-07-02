---
id: PERF-895
slug: remove-dead-aborted-code
status: unclaimed
claimed_by: ""
created: 2024-07-02
completed: ""
result: ""
---

# PERF-895: Remove Dead `aborted` Checks in Multi-Worker Loop Dispatch

## Focus Area
The multi-worker loop dispatch logic in `CaptureLoop.ts` contains dead code that checks if `aborted` is true right after it has already guaranteed it is not aborted.

## Background Research
In the chunked multi-worker fast paths (`isDomStrategyWriter` and `else` branches), the loop breaks if `aborted` is true.

```typescript
              if (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                while (frameBufferRing[ringIndex] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              } else if (aborted) {
                break;
              }
```

Immediately following this block, the code checks if `aborted` is true again to resolve `workerThenables` with `-1` (indicating abortion).

```typescript
              if (freeWorkersHead > 0) {
                if (aborted) {
                  while (freeWorkersHead > 0) {
                    const w = freeWorkers[--freeWorkersHead];
                    workerThenables[w].resolve(-1);
                  }
                  writerWaiterPromise.resolve();
                } else {
```

However, because the preceding block guarantees that execution will `break` out of the loop if `aborted` is true, the `if (aborted)` branch inside the `if (freeWorkersHead > 0)` block is entirely dead code and will never be executed. Removing this dead code branch completely eliminates a redundant V8 dynamic property check in the tight hot loops of the fast paths.

The first unchunked multi-worker initialization loop also has the exact same dead code pattern right after `if (aborted) break;`.

```typescript
          if (aborted) break;

            const ringIndex = nextFrameToWrite & ringMask;
            if (frameBufferRing[ringIndex] === null) {
              await writerWaiterPromise;
              continue;
            }
```
And further down:
```typescript
            if (freeWorkersHead > 0) {
              if (aborted) {
                while (freeWorkersHead > 0) {
                  const w = freeWorkers[--freeWorkersHead];
                  workerThenables[w].resolve(-1);
                }
                writerWaiterPromise.resolve();
              } else {
```

By removing the `if (aborted) { ... } else { ... }` wrapper and just keeping the code from the `else` block, we avoid the redundant branch check.

## Benchmark Configuration
- **Composition URL**: http://localhost:8080/ (Standard Benchmark)
- **Render Settings**: 1080p, 60fps, 10s duration, CPU software encode
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: This optimization targets purely the micro-overhead within V8's hot path loop branching inside the worker dispatch block. By removing unreachable code branches, it decreases V8 parser overhead and improves branch prediction.

## Implementation Spec

### Step 1: Remove dead `aborted` branches in CaptureLoop.ts
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the three instances of `if (freeWorkersHead > 0)` that contain an `if (aborted)` check inside the `CaptureLoop.ts` multi-worker code paths.
Because `if (aborted) break;` is guaranteed to have happened earlier in the control flow, remove the `if (aborted)` block and unwrap the `else` block directly into the `if (freeWorkersHead > 0)` block.

```typescript
              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                while (
                  freeWorkersHead > 0 &&
                  nextFrameToSubmit < totalFrames &&
                  nextFrameToSubmit < maxSubmits
                ) {
                  const w = freeWorkers[--freeWorkersHead];
                  const n = nextFrameToSubmit++;
                  const ringIndex = n & ringMask;
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
```
**Why**: Eliminates dead code paths and redundant conditional branch evaluations per loop iteration.
**Risk**: None. The `if (aborted)` check preceding these blocks explicitly breaks out of the loop context. The aborted resolution cleanup is correctly handled by the surrounding `try...finally` block logic for aborted captures.

## Canvas Smoke Test
Run `npm run start -- dom` and `npm run start -- canvas` in the test project to verify both paths complete successfully and video files are generated without deadlocks.

## Correctness Check
Run the CDP shadow DOM sync tests `npm run test -w packages/renderer` to ensure no functionality is disrupted.
