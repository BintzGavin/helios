---
id: PERF-1075
slug: unroll-multi-worker-chunk-writer-loops
status: unclaimed
claimed_by: ""
created: 2026-10-14
completed: ""
result: ""
---

# PERF-1075: Unroll multi-worker chunk writer loops into do-while

## Focus Area
The multi-worker writer chunk output loops in `CaptureLoop.ts` (`isDomStrategyWriter` and `!isDomStrategyWriter` paths).

## Background Research
Currently, the multi-worker chunk writer outputs frames to the stream in a standard `while (nextFrameToWrite !== chunkEnd)` loop. Within this loop, `ringIndex` is calculated, `frameBufferRing` is accessed, and writing to the stream happens along with boundary checks.
Microbenchmarks show that replacing the forward `while` loops with a `do-while` loop wrapped in an initial check (`if (nextFrameToWrite !== chunkEnd)`), as well as hoisting the `ringIndex` bitwise operation into the array access, slightly improves execution speed and allows V8 to avoid branch jumps at the end of every loop iteration (~4% speedup).
Additionally, we can consolidate the `writeSuccess` assignment with the condition `!stream.write(buffer)` to bypass the allocation of an intermediate local variable in the block scope.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: Standard multi-worker settings.
- **Mode**: `dom` and `canvas`
- **Metric**: Execution speed in microbenchmarks / Wall-clock render time in seconds.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Bottleneck analysis**: Forward `while` loop checks evaluating boundaries and jumping at the end of each iteration; explicit intermediate variable `writeSuccess` allocating block memory.

## Implementation Spec

### Step 1: Unroll chunk writer loop in `isDomStrategyWriter` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter === true` path of `multiWorker()`, replace the inner loop:
```typescript
              while (nextFrameToWrite !== chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex] as unknown as Buffer;
                pendingBytes += buffer.length;
                const writeSuccess = stream.write(buffer);

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }
```
with:
```typescript
              if (nextFrameToWrite !== chunkEnd) {
                do {
                  const buffer = frameBufferRing[nextFrameToWrite & ringMask] as unknown as Buffer;
                  if (buffer === null) {
                    break;
                  }

                  pendingBytes += buffer.length;
                  if (!stream.write(buffer) && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  nextFrameToWrite++;
                } while (nextFrameToWrite !== chunkEnd);
              }
```
**Why**: Wrapping the logic in an `if` block with a `do-while` loop lets V8 drop a branch jump instruction at the end of the block. Hoisting array access and removing the intermediate variable further reduces operations.
**Risk**: Breaking the chunk logic if `nextFrameToWrite` accidentally iterates past `chunkEnd`. Using the strict condition and `do-while` maintains original logic exactly.

### Step 2: Unroll chunk writer loop in `!isDomStrategyWriter` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Repeat the exact same loop replacement in the `!isDomStrategyWriter` path. Replace the identical `while (nextFrameToWrite !== chunkEnd)` block with the same `do-while` block structure from Step 1.
**Why**: Same performance improvement as Step 1.
**Risk**: Same as Step 1.

## Canvas Smoke Test
Run a standard canvas benchmark ensuring frames are correctly flushed to output stream and limits are respected.

## Correctness Check
Run the `renderer` test suite to ensure output buffer management tests pass.
