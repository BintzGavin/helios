---
id: PERF-1011
slug: unroll-buffer-type-dispatch-in-multi-worker-writer-chunk
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1011: Unroll buffer type dispatch in multi-worker writer chunk loops

## Focus Area
The multi-worker writer chunk loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the buffer length calculation and stream write logic for the chunked writer loop.

## Background Research
Currently, inside the multi-worker writer loop, `stream.write` and `length` property access are polymorphic because the `buffer` could be a Node.js `Buffer` (from DOM strategy) or a different string/buffer object (from Canvas). Because `buffer` is cast to `any`, V8's inline caches for property access (`buffer.length`) and method dispatch (`stream.write`) are polymorphic, causing deoptimizations.

A previous plan for this (PERF-987) was marked as discarded because the renderer had a syntax error that was introduced by previous commits making it impossible to evaluate the performance improvement properly. We are re-introducing this optimization. It will provide V8 with a guaranteed monomorphic type context by branching on `isDomStrategyWriter` outside the tight `while (nextFrameToWrite < chunkEnd)` loop, isolating the DOM and Canvas stream write paths.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas multi-worker benchmarks
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unoptimized polymorphic property access `buffer.length` and polymorphic `stream.write` calls during the multi-worker stream writing.

## Implementation Spec

### Step 1: Unroll write logic in the chunked writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `if (!aborted)` block, inside `while (nextFrameToWrite < totalFrames && !aborted)`, locate the inner chunk loop:
```typescript
              while (nextFrameToWrite < chunkEnd) {
                const ringIndex = nextFrameToWrite & ringMask;
                if (frameBufferRing[ringIndex] === null) {
                  break;
                }

                const buffer = frameBufferRing[ringIndex]!;
                pendingBytes += (buffer as any).length;
                const writeSuccess = stream.write(buffer as any);

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }

                nextFrameToWrite++;
              }
```

Replace it with:
```typescript
              if (isDomStrategyWriter) {
                while (nextFrameToWrite < chunkEnd) {
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
              } else {
                while (nextFrameToWrite < chunkEnd) {
                  const ringIndex = nextFrameToWrite & ringMask;
                  if (frameBufferRing[ringIndex] === null) {
                    break;
                  }

                  const buffer = frameBufferRing[ringIndex]!;
                  pendingBytes += (buffer as any).length;
                  const writeSuccess = stream.write(buffer as any);

                  if (!writeSuccess && pendingBytes >= 16777216) {
                    await this.drainPromise;
                    pendingBytes = 0;
                  }

                  nextFrameToWrite++;
                }
              }
```

**Why**: Isolates the DOM path from the canvas path to reduce redundant branch parser instructions and provide V8 with a guaranteed monomorphic type context inside the tight stream writing loop, eliminating V8 PIC state.

## Canvas Smoke Test
Run `npx vitest -t "verify-canvas-strategy"` to ensure the Canvas strategy path works.

## Correctness Check
Run `npx vitest -t "verify-dom-strategy-capture"` to ensure the DOM path is still functioning correctly. Run `npm run test -w packages/renderer` to ensure nothing is broken.
