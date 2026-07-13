---
id: PERF-987
slug: unroll-buffer-type-dispatch-in-writer-loop
status: unclaimed
claimed_by: ""
created: 2024-07-13
completed: ""
result: ""
---

# PERF-987: Unroll buffer type dispatch in multi-worker writer chunk loops

## Focus Area
The multi-worker frame rendering writer chunk loop in `packages/renderer/src/core/CaptureLoop.ts` (around line 966).

## Background Research
Currently, the main frame-processing loop for multi-worker captures uses a generic variable `buffer` and unconditionally checks `(buffer as any).length`, then invokes `stream.write(buffer as any)`. However, `buffer` can be either a `Buffer` object (DOM strategy) or a `string` (Canvas strategy). In V8, repeatedly calling `.length` on mixed types (String vs Node.js Buffer) in a tight loop forces the runtime into a polymorphic inline cache (PIC) state, which prevents Turbofan from optimizing the property access.
By duplicating the `while (nextFrameToWrite < chunkEnd)` inner loop and branching on `if (isDomStrategyWriter)` *before* entering it, V8's JIT compiler can maintain a monomorphic state inside each respective loop. We can safely retrieve `isDomStrategyWriter` exactly as it's defined earlier in the method (`const isDomStrategyWriter = this.pool[0].strategy.constructor.name === 'DomStrategy';`).

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas benchmarks
- **Render Settings**: Standard
- **Mode**: `dom` and `canvas` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unoptimized polymorphic property access `(buffer as any).length` inside the multi-worker chunk stream writing loop.

## Implementation Spec

### Step 1: Branch on \`isDomStrategyWriter\` for the chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path (around line 966), locate the chunk processing loop:
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
Wrap this loop in an `if (isDomStrategyWriter) { ... } else { ... }` block.
Inside the `isDomStrategyWriter` branch, cast the buffer: `const buf = buffer as unknown as Buffer;` and use `buf.length` and `stream.write(buf)`.
Inside the `else` branch, keep the existing `(buffer as any).length` and `stream.write(buffer as any)`.

**Why**: Provides V8 with a guaranteed monomorphic type context inside the tight loop, avoiding inline cache misses and de-optimizations when evaluating the buffer length.

## Correctness Check
Run `npm test -w packages/renderer` to ensure nothing is broken.
