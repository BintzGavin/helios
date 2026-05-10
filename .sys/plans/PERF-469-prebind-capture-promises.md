---
id: PERF-469
slug: prebind-capture-promises
status: claimed
claimed_by: "executor-session"
created: 2024-05-10
completed: "2024-05-10"
result: "failed"
---

# PERF-469: Replace captureloop writeToStdin promise with thenable

## Focus Area
The `CaptureLoop.ts` frame processing hot loop. Specifically, the backpressure synchronization between the worker pool and the `FFmpegManager` stdin pipe.

## Background Research
Currently, when `CaptureLoop` writes frame data to the FFmpeg stdin stream and encounters backpressure (`write` returns `false`), it returns a new `Promise` with a bound executor (`drainPromiseExecutor`).
```typescript
    if (!canWriteMore) {
        return new Promise<void>(this.drainPromiseExecutor);
    }
```
In V8, allocating a new `Promise` object in a high-frequency hot loop incurs state machine overhead and garbage collection pressure. Because `CaptureLoop` only ever awaits a single drain event at a time (it waits for the pipe to drain before writing the next frame), we can replace the `Promise` instantiation with a static, pre-allocated "thenable" object. A thenable is simply an object with a `then(resolve, reject)` method. When `await` encounters a thenable, it seamlessly integrates it into the microtask queue without needing to instantiate a full native Promise.

Scratchpad testing shows that returning a pre-allocated thenable object instead of `new Promise` yields a ~20% microbenchmark speedup for async resolution binding:
- Promise: ~41.97ms
- Awaitable (Thenable): ~33.67ms

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.02s
- **Bottleneck analysis**: The CaptureLoop tightly couples rendering and FFmpeg IPC. Any object allocation or microtask overhead inside this loop directly delays the worker pool from processing subsequent frames.

## Implementation Spec

### Step 1: Replace `drainPromiseExecutor` with a pre-allocated Thenable in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `private drainPromiseExecutor = ...`.
2. Introduce a new private property:
   ```typescript
   private drainAwaitable = {
     then: (resolve: () => void, reject: (err: Error) => void) => {
       this.drainResolve = resolve;
       this.drainReject = reject;
     }
   };
   ```
3. Update `writeToStdin` to return this awaitable when backpressure occurs:
   ```typescript
<<<<<<< SEARCH
    if (!canWriteMore) {
        return new Promise<void>(this.drainPromiseExecutor);
    }
=======
    if (!canWriteMore) {
        return this.drainAwaitable as unknown as Promise<void>;
    }
>>>>>>> REPLACE
   ```
**Why**: This entirely eliminates the allocation of the `Promise` instance every time FFmpeg signals backpressure. The `await writeResult` inside the main loop natively understands `then` interfaces.
**Risk**: If `await` behavior diverges for custom thenables in Playwright's specific Node environment, it might lead to unhandled rejections, though standard Node.js handles it natively.

## Canvas Smoke Test
Run a single canvas rendering benchmark to ensure the capture loop backpressure handles WebGL/Canvas pipelines correctly with the thenable.

## Correctness Check
Verify that the output MP4 video is still generated correctly and has the expected duration and frames (e.g. `150` frames).

## Prior Art
- PERF-467 successfully eliminated `Promise.race` inside `CdpTimeDriver.ts`.
- PERF-382 attempted to rewrite the entire CaptureLoop ring into native promises, which failed due to structural changes. This plan specifically targets the isolated `drainPromiseExecutor` allocation without altering the loop's structure.

## Results Summary
- **Best render time**: 1.711s (vs baseline 1.717s)
- **Improvement**: Inconclusive (~0%)
- **Kept experiments**: None
- **Discarded experiments**: Replaced `drainPromiseExecutor` promise allocation with a pre-allocated thenable in `CaptureLoop.ts`.
