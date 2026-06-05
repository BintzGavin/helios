---
id: PERF-683
slug: single-worker-fast-path
status: unclaimed
claimed_by: ""
created: 2024-06-05
completed: ""
result: ""
---

# PERF-683: Single Worker Fast Path in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The `CaptureLoop.ts` uses an Actor Model architecture with backpressure, a ring buffer, and separate microtasks for workers and the writer. This is designed for high-concurrency canvas rendering where multiple Playwright pages capture frames in parallel.

However, DOM rendering (and often Canvas rendering in resource-constrained environments like the microVM) runs with a concurrency of exactly `1` (`const concurrency = 1;` hardcoded in `BrowserPool.ts`). When `poolLen === 1`, the complex Actor Model (with its `frameBufferRing`, `workerBlockedExecutors`, `checkState` closures, and writer waiter promises) adds significant, pure overhead. We are paying the microtask and synchronization costs of a multi-worker pipeline for a strictly sequential, single-worker workload.

By bypassing the entire actor model and implementing a direct, sequential fast-path when `poolLen === 1`, we can eliminate the ring buffer array lookups, the blocked executor promise allocations, and the writer waiter promise allocations entirely, combining the capture and write steps into a single tight loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.127s
- **Bottleneck analysis**: Microtask and closure allocation overhead caused by the multi-worker actor model infrastructure when executing a sequential single-worker capture.

## Implementation Spec

### Step 1: Add a Single Worker Fast Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, check if `poolLen === 1`. If it is, run a simplified loop that directly captures and writes frames sequentially. Only use the complex actor model if `poolLen > 1`.

```typescript
    const poolLen = this.pool.length;

    // FAST PATH FOR SINGLE WORKER
    if (poolLen === 1) {
        const worker = this.pool[0];
        const { timeDriver, strategy, page } = worker;

        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = i * timeStep;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);

                if (i === nextProgressFrame) {
                    console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                    nextProgressFrame += progressInterval;
                }

                if (onProgress) {
                    onProgress(i / totalFrames);
                }

                if (previousWritePromise) {
                    await previousWritePromise;
                    previousWritePromise = undefined;
                }

                if (stdin?.writable) {
                    let canWriteMore: boolean;
                    if (typeof buffer === 'string') {
                        canWriteMore = stdin.write(buffer, 'base64', this.handleWriteError);
                    } else {
                        canWriteMore = stdin.write(buffer, this.handleWriteError);
                    }

                    if (!canWriteMore) {
                        previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                    }
                } else {
                    console.warn('FFmpeg stdin is not writable. Skipping write.');
                }
            }
        } catch (e) {
            fatalError = e;
        }

        if (fatalError) throw fatalError;
        if (capturedErrors.length > 0) throw capturedErrors[0];
        if (signal && signal.aborted) throw new Error('Aborted');

        if (previousWritePromise) {
            await previousWritePromise;
        }

        // ... (Finish logic remains the same, handled below)
    } else {
        // ... (Existing Actor Model Logic for poolLen > 1)
    }
```
*Note: Wrap the existing actor model logic (from the definition of `maxPipelineDepth` down to `await Promise.all(workerPromises);`) in an `else` block, while keeping the cleanup/finish logic (`console.log('Finishing render strategy...');` and below) shared at the end.*

**Why**: This merges the capture and write steps into a single loop, eliminating the ring buffer, the `checkState` orchestration, and the `writerWaiterExecutor` microtasks, which are unnecessary for a single worker.
**Risk**: If any complex interaction relied on the slight async delay between capture and write, it might shift behavior, but the capture logic itself is synchronous to the Playwright page.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` to ensure canvas/core operations remain unaffected.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts` and verify output integrity and performance times.
