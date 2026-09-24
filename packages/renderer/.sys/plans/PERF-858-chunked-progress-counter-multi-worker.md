---
id: PERF-858
slug: chunked-progress-counter-multi-worker
status: complete
claimed_by: "executor-session"
created: 2026-06-26
completed: ""
result: "discard"
---

# PERF-858: Replace Loop Branching with Chunked Inner Loops in CaptureLoop Multi-Worker Write Path

## Focus Area
`CaptureLoop.ts` multi-worker write loop progress logging paths and the `nextFrameToWrite < totalFrames` loop structure.

## Background Research
Currently, `CaptureLoop.ts` multi-worker write paths evaluate `if (nextFrameToWrite === nextProgress || nextFrameToWrite === totalFrames)` and loop bound `while (nextFrameToWrite < totalFrames && !aborted)` on every single frame iteration.
Microbenchmarks evaluating a chunked loop transformation on multi-worker loops (a chunked `while` loop containing an unbranched `for` loop until the next progress interval) show significant microbenchmark improvements (~69% faster loop iteration, from ~1.14ms down to ~0.35ms for 1,000,000 iterations).

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom` (multi-worker path)
- **Metric**: Microbenchmark loop iteration time / Wall-clock render time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 engine evaluates branching logic (`if (nextFrameToWrite === nextProgress || nextFrameToWrite === totalFrames)`) inside the tightest inner write loop thousands of times.

## Implementation Spec

### Step 1: Refactor multi-worker string write loops to chunked while loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker capture paths, replace the `isString` write loop structure:
```typescript
<<<<<<< SEARCH
      if (!aborted && isString) {
        while (nextFrameToWrite < totalFrames && !aborted) {
          const ringIndex = nextFrameToWrite & ringMask;
          if (frameReadyRing[ringIndex] === 0) {
            while (frameReadyRing[ringIndex] === 0 && !aborted) {
              await writerWaiterPromise;
            }
            if (aborted) break;
          }

          const buffer = frameBufferRing[ringIndex]! as string;

          const maxBytes = (buffer.length * 3) >>> 2;
          let pooled = multiFreePool.pop();
          if (!pooled || pooled.buffer.length < maxBytes) {
            pooled = new PooledBuffer(
              maxBytes + (maxBytes >> 1),
              multiFreePool,
            );
          }
          const written = pooled.buffer.write(buffer, "base64");
          const chunk = pooled.buffer.subarray(0, written);
          pendingBytes += written;
          const writeSuccess = stream.write(chunk, pooled.freeCb);

          if (!writeSuccess && pendingBytes >= 16777216) {
            await this.drainPromise;
            pendingBytes = 0;
          }

          nextFrameToWrite++;
          if (freeWorkersHead > 0) checkState();

          if (
            !aborted &&
            (nextFrameToWrite === nextProgress ||
              nextFrameToWrite === totalFrames)
          ) {
            if (nextFrameToWrite === nextProgress)
              nextProgress += progressInterval;
            console.log(
              `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
            );
            if (onProgress) onProgress(nextFrameToWrite / totalFrames);
          }
        }
      } else if (!aborted) {
=======
      if (!aborted && isString) {
        while (nextFrameToWrite < totalFrames && !aborted) {
          let chunkEnd = nextFrameToWrite + progressInterval;
          if (chunkEnd > totalFrames) chunkEnd = totalFrames;

          for (; nextFrameToWrite < chunkEnd && !aborted; ) {
            const ringIndex = nextFrameToWrite & ringMask;
            if (frameReadyRing[ringIndex] === 0) {
              while (frameReadyRing[ringIndex] === 0 && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }

            const buffer = frameBufferRing[ringIndex]! as string;

            const maxBytes = (buffer.length * 3) >>> 2;
            let pooled = multiFreePool.pop();
            if (!pooled || pooled.buffer.length < maxBytes) {
              pooled = new PooledBuffer(
                maxBytes + (maxBytes >> 1),
                multiFreePool,
              );
            }
            const written = pooled.buffer.write(buffer, "base64");
            const chunk = pooled.buffer.subarray(0, written);
            pendingBytes += written;
            const writeSuccess = stream.write(chunk, pooled.freeCb);

            if (!writeSuccess && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            nextFrameToWrite++;
            if (freeWorkersHead > 0) checkState();
          }

          if (aborted) break;

          console.log(
            `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
          );
          if (onProgress) onProgress(nextFrameToWrite / totalFrames);
        }
      } else if (!aborted) {
>>>>>>> REPLACE
```

### Step 2: Refactor multi-worker buffer write loops to chunked while loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker capture paths, replace the `!isString` write loop structure:
```typescript
<<<<<<< SEARCH
      } else if (!aborted) {
        while (nextFrameToWrite < totalFrames && !aborted) {
          const ringIndex = nextFrameToWrite & ringMask;
          if (frameReadyRing[ringIndex] === 0) {
            while (frameReadyRing[ringIndex] === 0 && !aborted) {
              await writerWaiterPromise;
            }
            if (aborted) break;
          }

          const buffer = frameBufferRing[ringIndex]!;

          pendingBytes += (buffer as any).length;
          const writeSuccess = stream.write(buffer as any);

          if (!writeSuccess && pendingBytes >= 16777216) {
            await this.drainPromise;
            pendingBytes = 0;
          }

          nextFrameToWrite++;
          if (freeWorkersHead > 0) checkState();

          if (
            !aborted &&
            (nextFrameToWrite === nextProgress ||
              nextFrameToWrite === totalFrames)
          ) {
            if (nextFrameToWrite === nextProgress)
              nextProgress += progressInterval;
            console.log(
              `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
            );
            if (onProgress) onProgress(nextFrameToWrite / totalFrames);
          }
        }
      }
    }
  } catch (e) {
=======
      } else if (!aborted) {
        while (nextFrameToWrite < totalFrames && !aborted) {
          let chunkEnd = nextFrameToWrite + progressInterval;
          if (chunkEnd > totalFrames) chunkEnd = totalFrames;

          for (; nextFrameToWrite < chunkEnd && !aborted; ) {
            const ringIndex = nextFrameToWrite & ringMask;
            if (frameReadyRing[ringIndex] === 0) {
              while (frameReadyRing[ringIndex] === 0 && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }

            const buffer = frameBufferRing[ringIndex]!;

            pendingBytes += (buffer as any).length;
            const writeSuccess = stream.write(buffer as any);

            if (!writeSuccess && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            nextFrameToWrite++;
            if (freeWorkersHead > 0) checkState();
          }

          if (aborted) break;

          console.log(
            `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
          );
          if (onProgress) onProgress(nextFrameToWrite / totalFrames);
        }
      }
    }
  } catch (e) {
>>>>>>> REPLACE
```

**Why**: Eliminates branch evaluations inside the tightest multi-worker writer loops.
**Risk**: Loop boundary off-by-one errors or early termination issues when `aborted` becomes true during the inner loop.

## Variations
None.

## Correctness Check
Run the vitest test suite (`npx vitest run packages/renderer/`).

## Results Summary
- **Best render time**: N/A
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: PERF-858 (Discarded as duplicate, superseded by PERF-859)
