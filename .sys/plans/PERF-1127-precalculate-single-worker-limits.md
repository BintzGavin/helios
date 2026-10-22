---
id: PERF-1127
slug: precalculate-single-worker-limits
status: unclaimed
claimed_by: ""
created: 2024-10-22
completed: ""
result: ""
---
# PERF-1127: Substitute `Math.min()` limit calculations in `CaptureLoop.ts`

## Focus Area
DOM rendering loop (`CaptureLoop.ts`). Target: V8 built-in `Math.min()` execution overhead inside single-worker loop boundary definitions.

## Background Research
In the multi-worker paths, we previously attempted to optimize `Math.min()` calls. While replacing it inside a ternary `limit = a < b ? a : b` failed (V8 optimizes the built-in Math functions better than unrolled ternary branches when compiled), there's a different angle.
In the single-worker path (`hasProcessFn === true`), the loop calculates:
`const chunkEnd = Math.min(i + maxPipelineDepth, totalFrames);`
Inside the main loop, replacing this `Math.min` with an explicitly precalculated boundary counter that doesn't trigger the C++ native boundary crossing inside V8's Math routines *might* yield a micro-gain, though it failed in the multi-worker path. Wait, the journal explicitly notes that `Math.min()` outperformed manual ternaries (PERF-1054 and PERF-1057 showed massive regressions). I will skip this approach.

Instead, let's look at `writeSuccess`. In `CaptureLoop.ts`, we write:
```typescript
if (!stream.write(...) && pendingBytes >= MAX_PENDING_BYTES) {
```
The method `stream.write()` returns a boolean. If it returns false, we evaluate `pendingBytes >= MAX_PENDING_BYTES`.
Can we invert the boolean logic to `if (pendingBytes >= MAX_PENDING_BYTES && !stream.write(...))`? No, the stream must *always* be written to. The short-circuit evaluation relies on `stream.write()` executing first. So that is already optimal.

Let's look at `processCaptureResult`.
In the `hasProcessFn` path, `processCaptureResult` is invoked on every frame:
```typescript
const buf = processCaptureResult(rawResult);
```
If we inline the known logic of `processCaptureResult` for DOM/Canvas strategies directly into the loop, we could save the function call overhead.
Wait, `processCaptureResult` is passed as a callback because `DomStrategy.ts` and `CanvasStrategy.ts` have different processing needs. However, the DOM strategy `processCaptureResult` is literally just returning the raw base64 buffer or string!
If `isDomStrategy` is true, we know the raw result is already the Base64 string. The `processCaptureResult` is essentially a pass-through or a string cast.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1080p, 60fps, fixed duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: Function call overhead.

## Implementation Spec

### Step 1: Inline `processCaptureResult` for DOM strategy
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` loops inside the `hasProcessFn` paths, we already have separate branches for DOM and Canvas.
Instead of calling `processCaptureResult(rawResult)`, directly cast or assign the result if it's the DOM path.
```typescript
if (isDomStrategy) {
   // dom strategy returns base64 string
   const buf = Buffer.from(rawResult as string, "base64");
   ...
}
```
Wait, in `DomStrategy.ts`, `capture` returns the base64 string directly. `processCaptureResult` is undefined for `DomStrategy`. The `CaptureLoop.ts` only sets `hasProcessFn` to true if the strategy *has* a `processCaptureResult` function.
DOM strategy does *not* have one. So `hasProcessFn` is `false` for DOM!
The `hasProcessFn` path is literally only for `CanvasStrategy`.
Therefore, there is no `processCaptureResult` overhead in the DOM path.

Let's reconsider. What about the single-worker `!hasProcessFn` chunk boundaries?
```typescript
          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) {
            let nextProgress = i + progressInterval;
            if (nextProgress > totalFrames) {
              nextProgress = totalFrames;
            }
```
This progress check happens inside the tight frame loop.

Instead of evaluating `nextProgress = i + progressInterval` every frame, we can use a countdown counter for progress logging.
```typescript
let progressCounter = progressInterval;
... inside loop ...
if (--progressCounter === 0) {
    onProgress(...);
    progressCounter = progressInterval;
}
```
Wait, we already optimized the modulo progress check into a fast counter in PERF-852!
Let's check `CaptureLoop.ts` to see what is there. It seems `nextProgress` is calculated.
Let's make a plan to simplify the progress interval logic to a pure countdown to avoid addition and bounds clamping per frame.
