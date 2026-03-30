---
id: PERF-111
slug: remove-ffmpeg-stdin-listener
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2026-03-30"
result: "no-improvement"
---

# PERF-111: Optimize Promise Creation for FFmpeg Stdin Draining

## Focus Area
The FFmpeg ingestion loop inside the `captureLoop` of `packages/renderer/src/Renderer.ts`.

## Background Research
Currently, when FFmpeg's `stdin.write()` returns `false` (indicating backpressure), the capture loop uses `events.once(ffmpegProcess.stdin, 'drain', { signal: ac.signal })` along with manual `AbortController` instantiation and an explicit `.then().catch()` chain inside the hot loop to wait for the stream to drain.
Although `events.once` is faster than instantiating event emitters manually, the setup still allocates an `AbortController`, an `Error` object for `ac.abort(new Error(...))`, and sets up multiple `stdin.once` listeners for `close` and `error` on **every single frame** where the buffer fills up.
Since we're processing thousands of frames in a CPU-bound microVM, generating `AbortController`s and `Error` objects so frequently puts unnecessary pressure on V8 GC. We can optimize this by relying on a persistent `Promise` and a simple, explicitly managed callback for the `drain` event, removing the `AbortController` and `.then().catch()` allocations inside the loop.

## Baseline
- **Current estimated render time**: ~33.394s
- **Bottleneck analysis**: The micro-allocations associated with `new AbortController()`, `new Error()`, and `once(..., 'drain')` returning a Promise that needs `.then()` chaining, creating garbage collection pressure inside the hot capture loop when backpressure triggers.

## Implementation Spec

### Step 1: Optimize backpressure handler
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside the `captureLoop`'s `while` loop (and at the very end when writing `finalBuffer`), replace the `events.once` and `AbortController` block:
```typescript
if (!canWriteMore) {
    previousWritePromise = new Promise<void>((resolve, reject) => {
        const onDrain = () => { cleanup(); resolve(); };
        const onError = (err: Error) => { cleanup(); reject(err); };
        const onClose = () => { cleanup(); reject(new Error('FFmpeg stdin closed before drain')); };

        const cleanup = () => {
            ffmpegProcess.stdin.removeListener('drain', onDrain);
            ffmpegProcess.stdin.removeListener('error', onError);
            ffmpegProcess.stdin.removeListener('close', onClose);
        };

        ffmpegProcess.stdin.once('drain', onDrain);
        ffmpegProcess.stdin.once('error', onError);
        ffmpegProcess.stdin.once('close', onClose);
    });
} else {
    previousWritePromise = undefined;
}
```
**Why**: This manually manages the listeners and avoids the overhead of instantiating `AbortController`, `events.once`, and handling `AbortError` logic on every blocked frame, directly mapping the Node.js event emitter logic to a single Promise allocation.
**Risk**: If `cleanup` is not called properly, it could leak listeners. But since it is guaranteed to fire one of the three events, it is safe.

## Correctness Check
Run the DOM rendering benchmark and check output for correctness and stability.


## Results Summary
- **Best render time**: 34.903s (vs baseline 35.089s)
- **Improvement**: 0.5% (within noise margin)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-111]
