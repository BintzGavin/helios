---
id: PERF-997
slug: merge-duplicated-loops-hasprocessfn
status: unclaimed
claimed_by: ""
created: 2024-07-26
completed: ""
result: ""
---

# PERF-997: Merge duplicated single-worker hasProcessFn loops into a unified loop

## Focus Area
The single-worker fast loops inside `packages/renderer/src/core/CaptureLoop.ts`, specifically where `hasProcessFn` is evaluated to loop frames.

## Background Research
In the single-worker path for `CaptureLoop.ts` (around line 240), there is a block of code conditionally handling chunk loops for frames where `isDomStrategy` is true or false.

The logic and structure for handling chunk iterations, limits (`chunkEnd`), calculating `pendingBytes`, calling `writeSuccess`, handling stream backpressure with `drainPromise`, aborting checks, and computing `nextProgress` for `hasProcessFn` path's `isDomStrategy = true` branch and `isDomStrategy = false` branch are highly duplicated, just as they were for `!hasProcessFn` (which was successfully optimized in PERF-992).

Currently, this looks like:

```typescript
if (isDomStrategy) {
    let i = 1;
    while (i < totalFrames - 1 && !aborted) {
        // chunkEnd calculation
        // for loop
        // progress and abort logic
    }
    if (!aborted && totalFrames > 1) {
        // Final frame unrolled
    }
} else {
    let i = 1;
    while (i < totalFrames - 1 && !aborted) {
        // EXACT same loop structure and condition
        // EXACT same chunkEnd calculation
        // EXACT same progress and abort logic
    }
    if (!aborted && totalFrames > 1) {
        // Final frame unrolled
    }
}
```

The loops can be unified by moving the `if (isDomStrategy)` check *inside* the single combined loop structure, reducing AST footprint, code size, and improving V8 instruction caching. We saw a ~15% performance boost when doing this for the `!hasProcessFn` loops (PERF-992), so doing it for the `hasProcessFn` path should provide comparable benefits.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard single-worker settings
- **Mode**: `dom` and `canvas`
- **Metric**: CPU instruction footprint, render wall clock time.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Bottleneck analysis**: The V8 parser processes, compiles, and optimizes two identically structured large `while` loops for `hasProcessFn`, increasing AST footprint and JIT burden. Unifying them reduces engine overhead.

## Implementation Spec

### Step 1: Merge `while` loops in `hasProcessFn` block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `if (hasProcessFn)` block (around lines 240-377), replace the entire `if (isDomStrategy) { ... } else { ... }` that holds the separate `let i = 1; while (...)` loops with a unified loop structure.

The combined structure will look exactly like:
```typescript
let i = 1;
while (i < totalFrames - 1 && !aborted) {
  const chunkEnd = Math.min(i + progressInterval, totalFrames - 1);
  for (; i < chunkEnd; i++) {
    const rawResult = await nextCapturePromise;

    const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);

    let buf;
    if (isDomStrategy) {
      nextCapturePromise = domBeginFrame!();
      const data = rawResult.screenshotData;
      if (data) {
        domLastFrameData = data;
        buf = Buffer.from(data as string, "base64");
        domLastFrameBuffer = buf;
      } else {
        buf = domLastFrameBuffer!;
      }
    } else {
      if (timePromise) await timePromise;
      nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
      buf = strategy.processCaptureResult!(rawResult);
    }

    pendingBytes += buf.length;
    const writeSuccessStr = stream.write(buf as any);

    if (!writeSuccessStr && pendingBytes >= 16777216) {
      await this.drainPromise;
      pendingBytes = 0;
    }
  }

  if (aborted) break;

  if (i - 1 === nextProgress) {
    nextProgress += progressInterval;
    console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
    if (onProgress) {
      onProgress((i - 1) / totalFrames);
    }
  }
}

if (!aborted && totalFrames > 1) {
  const rawResult = await nextCapturePromise;

  let buf;
  if (isDomStrategy) {
    const data = rawResult.screenshotData;
    if (data) {
      domLastFrameData = data;
      buf = Buffer.from(data as string, "base64");
      domLastFrameBuffer = buf;
    } else {
      buf = domLastFrameBuffer!;
    }
  } else {
    buf = strategy.processCaptureResult!(rawResult);
  }

  pendingBytes += buf.length;
  const writeSuccessStr = stream.write(buf as any);

  if (!writeSuccessStr && pendingBytes >= 16777216) {
    await this.drainPromise;
    pendingBytes = 0;
  }

  i++;
  if (i - 1 === nextProgress || i === totalFrames) {
    if (i - 1 === nextProgress) nextProgress += progressInterval;
    console.log(`Progress: Rendered ${i - 1} / ${totalFrames} frames`);
    if (onProgress) {
      onProgress((i - 1) / totalFrames);
    }
  }
}
```
**Why**: Reduces AST parsing and instruction size in V8.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode is fully operational.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM still writes streams correctly.
