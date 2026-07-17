---
id: PERF-1031
slug: restore-multi-worker-dom-loop
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1031: Restore optimized DOM loop in multi-worker `hasProcessFn` path

## Focus Area
The multi-worker loop inside `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
PERF-971 mistakenly removed the `if (isDomStrategy)` block within the multi-worker `hasProcessFn` path because it incorrectly assumed `DomStrategy` did not define `processCaptureResult`. However, `DomStrategy.prototype.processCaptureResult` does exist, meaning the multi-worker DOM path falls into `hasProcessFn` true path.

Because the optimized `isDomStrategy` block was removed, the DOM multi-worker path falls back to the generic Canvas path, which writes Base64 strings directly to the FFmpeg stream (as UTF-8 bytes) without decoding them into `Buffer` objects, causing FFmpeg to fail, and missing out on the `domBeginFrame!` closure optimizations and microtask elimination.

Restoring the `if (isDomStrategy)` block with its optimized logic will fix the FFmpeg stream corruption and restore the CPU-bound optimizations for the DOM multi-worker path.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The generic loop is extremely slow and corrupts the stream for the DOM multi-worker strategy because it fails to base64 decode the string. Restoring the optimized DOM loop removes these issues.

## Implementation Spec

### Step 1: Restore `isDomStrategy` block in multi-worker `hasProcessFn` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the multi-worker `if (hasProcessFn)` block (around line 712-750).
1. Copy the current `while (!aborted && nextFrameToSubmit < totalFrames) { ... }` block inside `if (hasProcessFn)` and place it inside the `else` block of an `if (isDomStrategy) { ... } else { ... }` check.
2. Inside the `isDomStrategy` `if` block, add the optimized DOM logic:
   - Calculate loop boundaries and check worker queue.
   - Set time driver.
   - Use `domBeginFrame!()` instead of `strategy.capture()`.
   - Cast `screenshotData` and base64 decode the result using `Buffer.from(data, "base64")`.

**Concrete script for executor**:
Run the following script to patch the file:

```javascript
const fs = require('fs');

const file = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `        if (hasProcessFn) {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              let i: number;
              if (nextFrameToSubmit < maxSubmits) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameBufferRing[ringIndex] = null;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
                maxSubmits = nextFrameToWrite + maxPipelineDepth;
              }

              if (i === -1) break;

              const ringIndex = i & ringMask;

              try {
                const timePromise = timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                if (timePromise) {
                  await timePromise;
                }
                let buffer: any;
                buffer = strategy.processCaptureResult!(
                  await strategy.capture(page, i * timeStep),
                );
                frameBufferRing[ringIndex] = buffer;

              } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
              }
              writerWaiterPromise.resolve();
            }
        } else {`;

const replace = `        if (hasProcessFn) {
          if (isDomStrategy) {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              let i: number;
              if (nextFrameToSubmit < maxSubmits) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;
                frameBufferRing[ringIndex] = null;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
                maxSubmits = nextFrameToWrite + maxPipelineDepth;
              }

              if (i === -1) break;
              const ringIndex = i & ringMask;

              try {
                let buffer: any;
                timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                const rawResult = await domBeginFrame!();
                const data = (rawResult as any).screenshotData;
                let buf: Buffer;
                if (data) {
                  domLastFrameData = data;
                  buf = Buffer.from(data as string, "base64");
                  domLastFrameBuffer = buf;
                } else {
                  buf = domLastFrameBuffer!;
                }
                buffer = buf;
                frameBufferRing[ringIndex] = buffer;
              } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
              }
              writerWaiterPromise.resolve();
            }
          } else {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              let i: number;
              if (nextFrameToSubmit < maxSubmits) {
                i = nextFrameToSubmit++;
                const ringIndex = i & ringMask;

                frameBufferRing[ringIndex] = null;
              } else {
                freeWorkers[freeWorkersHead++] = workerIndex;
                i = (await workerThenables[workerIndex]) as any as number;
                maxSubmits = nextFrameToWrite + maxPipelineDepth;
              }

              if (i === -1) break;

              const ringIndex = i & ringMask;

              try {
                const timePromise = timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                if (timePromise) {
                  await timePromise;
                }
                let buffer: any;
                buffer = strategy.processCaptureResult!(
                  await strategy.capture(page, i * timeStep),
                );
                frameBufferRing[ringIndex] = buffer;

              } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
              }
              writerWaiterPromise.resolve();
            }
          }
        } else {`;

code = code.replace(search, replace);
fs.writeFileSync(file, code);
```
