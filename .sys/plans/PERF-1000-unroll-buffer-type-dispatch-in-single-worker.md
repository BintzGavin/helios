---
id: PERF-1000
slug: unroll-buffer-type-dispatch-in-single-worker
status: unclaimed
claimed_by: ""
created: 2024-07-27
completed: ""
result: ""
---

# PERF-1000: Unroll buffer type dispatch in single-worker fast loops

## Focus Area
The single-worker fast chunk loops in `packages/renderer/src/core/CaptureLoop.ts`. Both the `hasProcessFn` and `!hasProcessFn` paths process a `buf` variable that is sometimes a `Buffer` and sometimes a `string` (or just `any`).

## Background Research
Currently, inside the merged single worker loops (for both `hasProcessFn = true` and `hasProcessFn = false`), the writing logic looks like this:
```typescript
                pendingBytes += buf.length;
                const writeSuccess = stream.write(buf); // or similar

                if (!writeSuccess && pendingBytes >= 16777216) {
                  await this.drainPromise;
                  pendingBytes = 0;
                }
```
Because `buf` could be a Node.js `Buffer` (from DOM strategy) or a `string` or other `any` type depending on the strategy, repeatedly calling `.length` inside these hot loops can cause V8 to drop into a polymorphic inline cache (PIC) state.
We can use a technique similar to PERF-994, but here we will specifically use the `isDomStrategy` flag (which is known for the entire loop) to explicitly cast the buffer. Since the loops are currently merged (e.g., from PERF-992/PERF-997), and we can't unroll the loops entirely without reverting those gains, we can optimize the property access by wrapping the inner chunk loop (`for (; i < chunkEnd; i++)`) with a check for `isDomStrategy` to explicitly type and handle `buf`.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas single-worker benchmarks
- **Render Settings**: Standard
- **Mode**: `dom` and `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unoptimized polymorphic property access `buf.length` and polymorphic `stream.write` calls inside the single-worker stream writing loops.

## Implementation Spec

### Step 1: Branch on `isDomStrategy` for the inner chunk loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, find the inner chunk loops (`for (; i < chunkEnd; i++)`) in both `hasProcessFn` and `!hasProcessFn` paths.
For example, inside `if (hasProcessFn)`:
```typescript
            while (i < totalFrames - 1 && !aborted) {
              const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);

              if (isDomStrategy) {
                for (; i < chunkEnd; i++) {
                   // ... capture frame logic ...

                   // Monomorphic DOM buffer handling
                   const b = buf as Buffer;
                   pendingBytes += b.length;
                   const writeSuccess = stream.write(b);

                   if (!writeSuccess && pendingBytes >= 16777216) {
                     await this.drainPromise;
                     pendingBytes = 0;
                   }
                }
              } else {
                for (; i < chunkEnd; i++) {
                   // ... capture frame logic ...

                   // Monomorphic generic buffer handling
                   pendingBytes += (buf as any).length;
                   const writeSuccess = stream.write(buf as any);

                   if (!writeSuccess && pendingBytes >= 16777216) {
                     await this.drainPromise;
                     pendingBytes = 0;
                   }
                }
              }
              // ...
```
Apply this unrolling to guarantee V8 monomorphism for `buf.length` and `stream.write()`. Note that `chunkEnd` and the `for` loop *are* present in the code for the single-worker chunking behavior (e.g. at lines 276 and 423), as verified.

**Why**: Provides V8 with a guaranteed monomorphic type context inside the tight loop, avoiding inline cache misses and de-optimizations.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken.
