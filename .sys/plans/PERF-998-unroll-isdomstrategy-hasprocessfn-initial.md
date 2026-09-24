---
id: PERF-998
slug: unroll-isdomstrategy-hasprocessfn-initial
status: complete
claimed_by: ""
created: 2024-07-26
completed: ""
result: "kept"
---

# PERF-998: Unroll isDomStrategy checks in single-worker hasProcessFn path

## Focus Area
The single-worker fast loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically the initial frame setup block within the `hasProcessFn = true` condition.

## Background Research
The initial frame setup in the single-worker `hasProcessFn` path evaluates `if (isDomStrategy)` three separate times in sequence. This is a constant value for the entire run.
By hoisting the `if (isDomStrategy)` check to the very top and duplicating the `if (totalFrames > 0)` logic into separate DOM and Canvas branches, we eliminate redundant branch evaluations for the V8 parser during the critical setup phase. This follows the exact same successful unrolling strategy applied to the `!hasProcessFn` path in PERF-995.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard single-worker settings
- **Mode**: `dom` and `canvas`
- **Metric**: CPU overhead time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- V8 overhead for evaluating the same condition 3 times sequentially.

## Implementation Spec

### Step 1: Unroll setup logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `if (hasProcessFn)` block, replace the nested `isDomStrategy` conditional structures with two distinct execution paths.

```typescript
if (hasProcessFn) {
  let nextCapturePromise = null;
  if (isDomStrategy) {
    if (totalFrames > 0) {
      timeDriver.setTime(page, startFrame * compTimeStep);
      nextCapturePromise = domBeginFrame!();
    }

    if (totalFrames > 0) {
      const rawResult = await nextCapturePromise;
      if (1 < totalFrames) {
        timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
        nextCapturePromise = domBeginFrame!();
      }
      const data = (rawResult as any).screenshotData;
      if (data) {
        domLastFrameData = data;
      }
      let buffer = domLastFrameData;
      console.log(\`Progress: Rendered 0 / \${totalFrames} frames\`);
      if (onProgress) {
        onProgress(0 / totalFrames);
      }
      if ((rawResult as any).screenshotData || !domLastFrameBuffer) {
        domLastFrameBuffer = Buffer.from(buffer as string, "base64");
      }
      const buf = domLastFrameBuffer;
      pendingBytes += buf.length;
      let writeSuccess = stream.write(buf);

      if (!writeSuccess && pendingBytes >= 16777216) {
        await this.drainPromise;
        pendingBytes = 0;
      }
    }
  } else {
    if (totalFrames > 0) {
      const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
      if (timePromise) {
        await timePromise;
      }
      nextCapturePromise = strategy.capture(page, 0);
    }

    if (totalFrames > 0) {
      const rawResult = await nextCapturePromise;
      if (1 < totalFrames) {
        const timePromise = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
        if (timePromise) {
          await timePromise;
        }
        nextCapturePromise = strategy.capture(page, timeStep);
      }
      let buffer = strategy.processCaptureResult!(rawResult);
      console.log(\`Progress: Rendered 0 / \${totalFrames} frames\`);
      if (onProgress) {
        onProgress(0 / totalFrames);
      }
      pendingBytes += (buffer as any).length;
      let writeSuccess = stream.write(buffer as any);

      if (!writeSuccess && pendingBytes >= 16777216) {
        await this.drainPromise;
        pendingBytes = 0;
      }
    }
  }
```

**Why**: Isolates the DOM path from the canvas path to reduce redundant branch parser instructions.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode is fully operational.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM still writes streams correctly.
