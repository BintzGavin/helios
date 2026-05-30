---
id: PERF-624
slug: single-worker-fast-path
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-624: Single Worker Fast Path Optimization

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In `BrowserPool.ts`, concurrency is currently hardcoded to `1` (from PERF-508). However, `CaptureLoop.ts` still uses a complex multi-worker actor model to manage backpressure, utilizing ring buffers (`frameBufferRing`, `frameReadyRing`), worker state arrays (`freeWorkers`, `workerBlockedResolves`), and deferred promises (`writerWaiterExecutor`) for synchronizing multiple workers with the FFmpeg writer.

When the pool length is exactly 1, all this synchronization machinery is pure overhead. By introducing a fast path for `this.pool.length === 1`, we can replace the complex actor model with a simple, synchronous-looking `for` loop that captures and writes each frame sequentially. This eliminates closure allocations, array bounds checking, and multiple microtask queues per frame.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Standard microVM constraints.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s (based on RENDERER-EXPERIMENTS.md data)
- **Bottleneck analysis**: Actor model and ring buffer synchronization overhead in the `CaptureLoop.ts` hot loop for single-worker scenarios.

## Implementation Spec

### Step 1: Add Fast Path for Single Worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `run()`, immediately after `setupDrainListeners()` and basic initialization, check if `this.pool.length === 1`. If so, execute a highly optimized sequential loop and return early, skipping the entire actor model.

```typescript
    if (this.pool.length === 1) {
      const worker = this.pool[0];
      const { timeDriver, strategy, page } = worker;
      let previousWritePromise: Promise<void> | undefined;

      try {
        for (let i = 0; i < this.totalFrames; i++) {
          if (this.capturedErrors.length > 0 || (signal && signal.aborted)) {
            break;
          }

          const time = i * timeStep;
          const compositionTimeInSeconds = (this.startFrame + i) * compTimeStep;

          const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
          const captureResult = setTimeResult
              ? setTimeResult.then(() => strategy.capture(page, time))
              : strategy.capture(page, time);

          let buffer;
          if (captureResult instanceof Promise) {
              buffer = await captureResult;
          } else {
              buffer = captureResult;
          }

          if (i > 0 && i % progressInterval === 0) {
              console.log(`Progress: Rendered ${i} / ${this.totalFrames} frames`);
          }
          if (onProgress) {
              onProgress(i / this.totalFrames);
          }

          if (previousWritePromise) {
              await previousWritePromise;
              previousWritePromise = undefined;
          }

          if (this.ffmpegManager.stdin?.writable) {
              let canWriteMore: boolean;
              if (typeof buffer === 'string') {
                  canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64', this.handleWriteError);
              } else {
                  canWriteMore = this.ffmpegManager.stdin.write(buffer, this.handleWriteError);
              }

              if (!canWriteMore) {
                  previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
              }
          }
        }
      } catch (e) {
         throw e;
      }

      if (this.capturedErrors.length > 0) {
          throw this.capturedErrors[0];
      }
      if (signal && signal.aborted) {
          throw new Error('Aborted');
      }

      if (previousWritePromise) {
          await previousWritePromise;
      }

      console.log('Finishing render strategy...');
      const finalBuffer = await strategy.finish(page);
      if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
        if (this.ffmpegManager.stdin?.writable) {
            let canWriteMore: boolean;
            if (typeof finalBuffer === 'string') {
                canWriteMore = this.ffmpegManager.stdin.write(finalBuffer, 'base64', this.handleWriteError);
            } else {
                canWriteMore = this.ffmpegManager.stdin.write(finalBuffer, this.handleWriteError);
            }
            if (!canWriteMore) {
                await new Promise<void>(this.drainPromiseExecutor);
            }
        }
      }

      console.log('Finished sending frames. Closing FFmpeg stdin.');
      this.ffmpegManager.stdin?.end();
      return;
    }
```

**Why**: By skipping the multi-worker actor loop, we eliminate `checkState`, ring buffers, `workerBlockedResolves`, and `writerWaiterResolve`. This drastically reduces V8 GC pressure and execution overhead for each frame, keeping the hot loop entirely inline.
**Risk**: If we ever increase concurrency back to >1, this fast path simply won't be taken. Backpressure is still handled correctly via `drainPromiseExecutor`.

## Correctness Check
Verify output via `npx tsx packages/renderer/scripts/benchmark-perf.ts`. Ensure the video renders successfully and doesn't crash.

## Prior Art
- PERF-508 (BrowserPool concurrency set to 1)
