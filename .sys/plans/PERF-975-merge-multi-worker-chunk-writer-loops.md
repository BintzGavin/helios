---
id: PERF-975
slug: merge-multi-worker-chunk-writer-loops
status: complete
claimed_by: ""
created: 2024-07-12
completed: ""
result: "improved"
---

# PERF-975: Merge duplicated multi-worker chunk writer loops

## Focus Area
The multi-worker writer chunk loops in `packages/renderer/src/core/CaptureLoop.ts` (lines 939-1080).

## Background Research
Currently, the multi-worker chunk loop evaluates the `if (!aborted && isDomStrategyWriter)` condition (at line 939) and splits into two virtually identical ~70-line `while (nextFrameToWrite < totalFrames && !aborted)` loops. The only difference is how the `buffer` is typed and written to the stream:
- DOM branch: `const buffer = frameBufferRing[ringIndex]! as unknown as Buffer;` and `stream.write(buffer)`
- Canvas branch: `const buffer = frameBufferRing[ringIndex]!;` and `stream.write(buffer as any)`

Because Node.js `stream.write` natively accepts chunks of various types (including Buffer arrays), we can safely eliminate this outer branch. By moving the typing difference directly into the stream write parameters (or simply relying on `buffer as any`), we can merge the entire 70-line dispatch and polling block into a single loop. This drastically reduces AST parsing footprint and allows V8 TurboFan inline caches to optimize a unified hot loop path.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Massive code duplication in the hot writer loop increases V8 compilation time, creates redundant hidden classes, and inflates memory footprint.

## Implementation Spec

### Step 1: Combine the chunk loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the block around line 939:
```typescript
          if (!aborted && isDomStrategyWriter) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              // ...
            }
          } else if (!aborted) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              // ...
            }
          }
```
Replace it with a single, unified block:
```typescript
          if (!aborted) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

              if (freeWorkersHead > 0) {
                const maxSubmits = nextFrameToWrite + maxPipelineDepth;
                const limit = Math.min(maxSubmits, totalFrames);
                let dispatches = limit - nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = Math.min(dispatches, freeWorkersHead);
                  let h = freeWorkersHead;
                  let n = nextFrameToSubmit;
                  for (let d = 0; d < dispatches; d++) {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
                  freeWorkersHead = h;
                  nextFrameToSubmit = n;
                }
                if (nextFrameToSubmit === totalFrames) {
                  for (let j = 0; j < freeWorkersHead; j++) {
                    const w = freeWorkers[j];
                    workerThenables[w].resolve(-1);
                  }
                  freeWorkersHead = 0;
                }
              }

              while (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex]!;
                pendingBytes += (buffer as any).length;
                const writeSuccess = stream.write(buffer as any);

                if (writeSuccess) {} else if (pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }

              if (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                while (frameBufferRing[ringIndex] === null && !aborted) {
                  await writerWaiterPromise;
                }
                if (aborted) break;
              } else if (aborted) {
                break;
              }

              if (nextFrameToWrite === nextProgress) {
                nextProgress += progressInterval;
                console.log(
                  `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
                );
                if (onProgress) onProgress(nextFrameToWrite / totalFrames);
              }
            }
          }
```

**Why**: Consolidating these identical loops forces V8 to trace and optimize a single unified loop block, reducing parsed AST and closure environments without affecting runtime speed since V8 inline caches seamlessly resolve the underlying object types for `stream.write`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to verify DOM streams continue to drain without issues.
