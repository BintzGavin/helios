---
id: PERF-1024
slug: unroll-buffer-type-dispatch-in-multi-worker-chunk-writer
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1024: Unroll buffer type dispatch in multi-worker writer chunk loops

## Focus Area
The multi-worker frame rendering main chunk writer loop in `packages/renderer/src/core/CaptureLoop.ts` (around lines 780-830).

## Background Research
Inside the multi-worker writer loops (e.g., `while (nextFrameToWrite < totalFrames && !aborted)`), there is an inner loop:
```typescript
while (nextFrameToWrite < chunkEnd) {
  // ...
  const buffer = frameBufferRing[ringIndex]!;
  pendingBytes += (buffer as any).length;
  const writeSuccess = stream.write(buffer as any);
  // ...
}
```
Currently, `buffer` can be either a Node.js `Buffer` (for DOM) or a `string` (for Canvas depending on where the base64 encode occurs). This causes polymorphic property access (`.length`) and method calls (`stream.write`) within the hot loop, preventing V8 from achieving a monomorphic inline cache (IC) state.

Previous successful experiments like PERF-882 unrolled similar logic. However, an earlier attempt to apply this specific unrolling (PERF-987, PERF-1011, PERF-1012, PERF-1013) were either discarded due to syntax errors or remain unclaimed/unmerged. This plan will execute it properly.

By checking `if (isDomStrategyWriter)` outside the inner chunk loop and duplicating the inner loop, we provide a strictly monomorphic context for the V8 JIT compiler.
- If `isDomStrategyWriter` is true, we explicitly cast the buffer as a `Buffer` (`const buf = buffer as unknown as Buffer`).
- If false, we cast to `any`.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Polymorphic type access inside the tightly-looped multi-worker writer causes V8 cache misses and slows down stream piping.

## Implementation Spec

### Step 1: Unroll buffer type dispatch in multi-worker writer chunk loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer logic, locate the chunk writer loop (around line 780-830):
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

Replace it with two strictly-typed loops wrapped by `if (isDomStrategyWriter)`:
```typescript
              if (isDomStrategyWriter) {
                while (nextFrameToWrite < chunkEnd) {
                  const ringIndex = nextFrameToWrite & ringMask;
                  if (frameBufferRing[ringIndex] === null) {
                    break;
                  }

                  const buffer = frameBufferRing[ringIndex]!;
                  const buf = buffer as unknown as Buffer;
                  pendingBytes += buf.length;
                  const writeSuccess = stream.write(buf);

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

## Variations
- If `isDomStrategyWriter` is not already available in the scope, ensure it is evaluated once before the loops (`const isDomStrategyWriter = this.pool[0].strategy.constructor.name === 'DomStrategy';`).

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas path isn't broken.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM output is still correct. And `npm run test -w packages/renderer`.
