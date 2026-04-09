---
id: PERF-225
slug: cache-ffmpeg-drain-listeners
status: unclaimed
claimed_by: ""
created: 2024-06-06
completed: ""
result: ""
---

# PERF-225: Cache FFmpeg drain listeners to eliminate GC pressure

## Focus Area
DOM Rendering Pipeline - FFmpeg Pipeline Backpressure overhead in `CaptureLoop.ts`.

## Background Research
The `CaptureLoop.run` method pushes generated frames into the FFmpeg `stdin` pipe. Because FFmpeg encoding is often slower than Playwright frame capture in DOM mode, the stream frequently backs up, causing `this.ffmpegManager.stdin.write` to return `false`. When this happens, the `writeToStdin` function waits for the `drain` event by calling Node.js's `events.once` combined with a new `AbortController` and multiple closures (`onClose`, `onError`) for every blocked frame.
This continuous allocation of promises, abort controllers, and listener functions on every frame generates significant garbage collection overhead and micro-stalls. By managing a single persistent `drain` listener or utilizing a cached Promise executor approach in `CaptureLoop.ts`, we can entirely eliminate this GC pressure, freeing up CPU cycles for the software rasterizer and FFmpeg. The memory states that `PERF-073` was once tested and kept, but inspecting the current `CaptureLoop.ts` shows it currently uses `events.once` and `AbortController`. We will optimize this with a cleaner cached promise listener pattern.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s
- **Bottleneck analysis**: Micro-stalls from heavy GC allocations on every blocked frame in the FFmpeg `stdin` write loop.

## Implementation Spec

### Step 1: Add persistent listener properties and setup
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Add the following properties to the `CaptureLoop` class:
```typescript
  private drainResolve: (() => void) | null = null;
  private drainReject: ((err: Error) => void) | null = null;
```
Create a private `setupDrainListeners` method and call it from the top of the `run` method:
```typescript
  private setupDrainListeners() {
    if (!this.ffmpegManager.stdin) return;
    this.ffmpegManager.stdin.on('drain', () => {
      if (this.drainResolve) {
        const resolve = this.drainResolve;
        this.drainResolve = null;
        this.drainReject = null;
        resolve();
      }
    });
    this.ffmpegManager.stdin.on('error', (err) => {
      if (this.drainReject) {
        const reject = this.drainReject;
        this.drainResolve = null;
        this.drainReject = null;
        reject(err);
      }
    });
    this.ffmpegManager.stdin.on('close', () => {
      if (this.drainReject) {
        const reject = this.drainReject;
        this.drainResolve = null;
        this.drainReject = null;
        reject(new Error('FFmpeg stdin closed before drain'));
      }
    });
  }
```

### Step 2: Replace `events.once` with cached promise
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the `import { once } from 'events';` at the top of the file.
In `writeToStdin`, replace the entire `if (!canWriteMore) { ... }` block with:
```typescript
    if (!canWriteMore) {
        await new Promise<void>((resolve, reject) => {
            this.drainResolve = resolve;
            this.drainReject = reject;
        });
    }
```
**Why**: This pattern allocates exactly one `Promise` and zero new closures when waiting for drain, drastically reducing V8 memory churn in the hot loop.
**Risk**: If FFmpeg stdin throws an error while `drainResolve` is null, the error listener must not swallow it. The `CaptureLoop` relies on the parent process/orchestrator catching the error event emitted by `ffmpegManager`.

## Correctness Check
Run the tests via `npx tsx packages/renderer/tests/run-all.ts` to ensure FFmpeg piping correctly handles backpressure without stalling.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the Canvas path remains fully functional, as it shares the `CaptureLoop`.

## Prior Art
PERF-073 (Cache FFmpeg Backpressure Event Listeners) was an earlier attempt at this optimization.