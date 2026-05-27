---
id: PERF-603
slug: cork-ffmpeg-stdin
status: unclaimed
claimed_by: ""
created: 2024-05-27
completed: ""
result: ""
---

# PERF-603: Native IPC Batching via Writable.cork()

## Focus Area
DOM Rendering Pipeline - Output Write Phase (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Currently, the CaptureLoop orchestration flushes each completed frame buffer into the FFmpeg `stdin` pipe individually. A previous experiment (PERF-597) attempted to batch these writes by accumulating frames into a unified array and concatenating them (via `Buffer.concat` or string concatenation) before writing. That experiment failed due to excessive memory pressure and GC pauses from userland buffering.
However, Node.js `stream.Writable` instances natively support batching via `.cork()` and `.uncork()`. When `.cork()` is active, Node.js queues written chunks internally. When `.uncork()` is called, Node.js flushes the queued chunks using `writev` (scatter/gather I/O) at the C++ layer, which sends them across the IPC pipe in a single system call.
By strategically calling `.cork()` when the writer loop is processing ready frames and `.uncork()` right before we `await` (either waiting for the next frame or waiting for the pipe to drain), we can achieve IPC batching natively without the userland memory/GC overhead of PERF-597.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 1920x1080, 60fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.267s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: IPC boundary crossings and Node.js stream overhead from writing 60+ individual chunks per second sequentially to the FFmpeg child process.

## Implementation Spec

### Step 1: Track Cork State in `CaptureLoop.run`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the main writer `try` block (around line 205), introduce a local boolean to track the cork state:
```typescript
    let isCorked = false;
    try {
        while (nextFrameToWrite < this.totalFrames && !aborted) {
```

### Step 2: Uncork Before Awaiting Frames
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
When the loop needs to wait for `writerWaiterExecutor` because the next frame isn't ready, we must flush any buffered frames.
Modify the `frameReadyRing` check:
```typescript
            const ringIndex = nextFrameToWrite & ringMask;
            if (frameReadyRing[ringIndex] === 0) {
                if (isCorked && this.ffmpegManager.stdin?.writable) {
                    this.ffmpegManager.stdin.uncork();
                    isCorked = false;
                }
                await new Promise<void>(writerWaiterExecutor);
                continue;
            }
```

### Step 3: Uncork Before Awaiting Drain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
When backpressure is applied (`previousWritePromise` is set), we must flush before waiting:
```typescript
            if (previousWritePromise) {
                if (isCorked && this.ffmpegManager.stdin?.writable) {
                    this.ffmpegManager.stdin.uncork();
                    isCorked = false;
                }
                await previousWritePromise;
                previousWritePromise = undefined;
            }
```

### Step 4: Cork Before Writing
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Before calling `write()`, ensure the stream is corked:
```typescript
            if (this.ffmpegManager.stdin?.writable) {
                if (!isCorked) {
                    this.ffmpegManager.stdin.cork();
                    isCorked = true;
                }

                let canWriteMore: boolean;
// ... (keep existing write logic)
```

### Step 5: Uncork at the End
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
After the `while` loop finishes, uncork any remaining frames:
```typescript
        } // end while

        if (isCorked && this.ffmpegManager.stdin?.writable) {
            this.ffmpegManager.stdin.uncork();
            isCorked = false;
        }
    } catch (e) {
```

**Why**: Using Node's native `cork/uncork` batches multiple frame writes into fewer `writev` IPC calls whenever multiple frames are ready in the ring buffer simultaneously.
**Risk**: If backpressure handling (`drain` event) is poorly implemented in Node's stream internals when combined with `cork()`, it could deadlock. However, standard Node.js patterns dictate it is safe to `uncork` before waiting for `drain`.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance, followed by `npm run test -w packages/renderer` to verify output correctly retains all frames and avoids truncation.
