---
id: PERF-150
slug: optimize-events-once
status: complete
claimed_by: "executor-session"
created: 2024-05-28
completed: "2026-04-02"
result: "no-improvement"
---

# PERF-150: Optimize FFmpeg Backpressure Handling by Eliminating events.once Overhead

## Focus Area
The FFmpeg stdin backpressure handler in the `captureLoop` of `packages/renderer/src/Renderer.ts`.

## Background Research
In PERF-072, `events.once` was introduced to handle stream drain events. While `events.once` is more optimized than manually creating `new Promise` closures for every event, inspecting the current usage in `Renderer.ts` reveals that we still allocate an `AbortController` and multiple `once` listeners (for `close` and `error`) on every blocked frame in the hot loop. Node.js `events.once` still performs internal listener setup and teardown.
By implementing a single, persistent `drain` event listener outside the capture loop that resolves a reusable deferred Promise (or simply unblocks a loop condition), we can eliminate the per-frame allocation of `AbortController`, event setup, and `events.once` invocation entirely.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture
- **Render Settings**: 1280x720, 30 FPS, dom mode, 150 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.057s (from PERF-136)
- **Bottleneck analysis**: AbortController and events.once allocations inside the `if (!canWriteMore)` block cause V8 memory churn when the pipe is constantly hitting backpressure.

## Implementation Spec

### Step 1: Implement Persistent Drain Listener
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Before the `captureLoop` starts, set up a persistent listener mechanism:
```typescript
let drainPromiseResolve: (() => void) | null = null;
let drainPromiseReject: ((err: Error) => void) | null = null;

const onDrain = () => {
    if (drainPromiseResolve) {
        const resolve = drainPromiseResolve;
        drainPromiseResolve = null;
        drainPromiseReject = null;
        resolve();
    }
};

const onErrorOrClose = (err?: Error) => {
    if (drainPromiseReject) {
        const reject = drainPromiseReject;
        drainPromiseResolve = null;
        drainPromiseReject = null;
        reject(err || new Error('FFmpeg stdin closed before drain'));
    }
};

ffmpegProcess.stdin.on('drain', onDrain);
ffmpegProcess.stdin.on('error', onErrorOrClose);
ffmpegProcess.stdin.on('close', () => onErrorOrClose());
```
Inside the `captureLoop`, replace the `events.once` backpressure handling and AbortController allocation:
```typescript
if (!canWriteMore) {
    previousWritePromise = new Promise<void>((resolve, reject) => {
        drainPromiseResolve = resolve;
        drainPromiseReject = reject;
    });
}
```
Remember to remove these listeners in the cleanup phase of the renderer.

**Why**: This reduces the per-blocked-frame allocation to just a single lightweight Promise, eliminating the heavier `AbortController` and internal Node.js event listener teardown logic from `events.once`.
**Risk**: Need to ensure stream errors or close events still properly reject or abort the loop. The permanent error/close listeners that reject the deferred promise handle this.

## Correctness Check
Run the benchmark suite `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to ensure rendering still completes successfully.

## Results Summary
- **Best render time**: 34.224s (vs baseline 34.119s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-150]
