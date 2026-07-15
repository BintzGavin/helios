---
id: PERF-1007
slug: unroll-buffer-type-dispatch-in-single-worker-initial
status: unclaimed
claimed_by: ""
created: 2024-07-28
completed: ""
result: ""
---

# PERF-1007: Unroll buffer type dispatch in single-worker initial frame processing

## Focus Area
The single-worker initialization (frame 0) processing in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the buffer length calculation and stream write logic for the first frame in both the `hasProcessFn = true` and `hasProcessFn = false` paths.

## Background Research
Similar to PERF-1000 which addressed the chunk loops, the initial frame processing logic handles writing the very first frame buffer to the stream.
In `hasProcessFn = true` paths:
```typescript
              // isDomStrategy = true
              const buf = domLastFrameBuffer;
              pendingBytes += buf.length;
              let writeSuccess = stream.write(buf);
```
```typescript
              // isDomStrategy = false
              let buffer = strategy.processCaptureResult!(rawResult);
              // ...
              pendingBytes += (buffer as any).length;
              let writeSuccess = stream.write(buffer as any);
```
In `hasProcessFn = false` paths:
```typescript
            let buf: any;
            if (isDomStrategy) {
               // ...
               buf = domLastFrameBuffer;
            } else {
               buf = rawResult;
            }
            pendingBytes += buf.length;
            const writeSuccess = stream.write(buf);
```
For `hasProcessFn = true`, the write logic is already split between the `isDomStrategy` true/false branches. We just need to explicitly cast `buf as Buffer` for the true branch to ensure monomorphism, and keep `(buffer as any)` for the false branch.
For `hasProcessFn = false`, the write logic is *merged* after the `if (isDomStrategy)` block. Because `buf` could be a Node.js `Buffer` (DOM) or `any` (Canvas), calling `buf.length` and `stream.write(buf)` is polymorphic.
We can unroll the stream writing logic in `hasProcessFn = false` into the respective `isDomStrategy` branches, explicitly typing the buffer as `Buffer` for the DOM strategy and as `any` for the canvas strategy.

This allows the V8 engine to maintain monomorphic inline caches for the stream write operation and property access, avoiding de-optimizations.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas single-worker benchmarks
- **Render Settings**: Standard
- **Mode**: `dom` and `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unoptimized polymorphic property access `buf.length` and polymorphic `stream.write` calls during the single-worker initial frame stream writing.

## Implementation Spec

### Step 1: Cast Buffer in `hasProcessFn = true`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `if (hasProcessFn) { if (isDomStrategy) {` block for the first frame (around line 230), change `const buf = domLastFrameBuffer;` to:
```typescript
              const buf = domLastFrameBuffer as Buffer;
```
So the code becomes:
```typescript
              const buf = domLastFrameBuffer as Buffer;
              pendingBytes += buf.length;
              let writeSuccess = stream.write(buf);
```
**Why**: Ensures monomorphic typing for `buf`.

### Step 2: Unroll write logic in `hasProcessFn = false`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `} else {` block (for `!hasProcessFn`), inside `if (1 < totalFrames) { ... }`, find the merged writing logic (around line 395-420).
Instead of defining `let buf: any;` before the `if (isDomStrategy)` and doing the length calculation and stream write after the `if-else` block, move the stream write logic inside both branches:

```typescript
            if (isDomStrategy) {
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              if (data || !domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from((data || rawResult) as string, "base64");
              }
              const buf = domLastFrameBuffer as Buffer;
              pendingBytes += buf.length;
              const writeSuccess = stream.write(buf);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            } else {
              const buf = rawResult as any;
              pendingBytes += buf.length;
              const writeSuccess = stream.write(buf);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }
```
**Why**: Provides V8 with a guaranteed monomorphic type context for the initial frame, avoiding inline cache misses.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken.
