---
id: PERF-698
slug: remove-thread-queue-size
status: unclaimed
claimed_by: ""
created: 2024-06-11
completed: ""
result: ""
---

# PERF-698: Optimize FFmpeg Stdin Pipe by Removing Thread Queue

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` and `CanvasStrategy.ts` - `getFFmpegArgs` method.

## Background Research
Currently, when we build the FFmpeg input arguments for the image pipe, we include `-thread_queue_size 512`:
```typescript
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', `${options.fps}`,
      '-thread_queue_size', '512',
      '-i', '-',
    ];
```
The `-thread_queue_size` option is typically used for real-time capture devices (like webcams or hardware screens) where FFmpeg needs to pull frames off the device into memory asynchronously to avoid dropping frames if the encoder lags.
However, our pipeline uses standard Unix standard input (`pipe:0`) from a Node.js process. When FFmpeg's encoding falls behind, the pipe buffer naturally fills up, and Node.js automatically applies backpressure (via the `canWriteMore` boolean from `stdin.write` in `CaptureLoop.ts`).

By adding `-thread_queue_size 512`, we force FFmpeg to spawn an additional thread just to read from the pipe and queue 512 frames in memory. This adds thread synchronization overhead inside FFmpeg and significantly increases memory pressure, while completely circumventing the natural and efficient Unix pipe backpressure mechanism. Since we are in a CPU-bound, headless microVM environment, this extra thread and memory buffering might actually slow down the overall pipeline throughput compared to direct, synchronized pipe reading.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.347s
- **Bottleneck analysis**: IPC latency and thread synchronization overhead in the FFmpeg child process, compounded by Node.js stream overhead.

## Implementation Spec

### Step 1: Remove `-thread_queue_size` from `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `getFFmpegArgs`, remove the `-thread_queue_size` and `512` arguments from the `videoInputArgs` array.

```typescript
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];
```

### Step 2: Remove `-thread_queue_size` from `CanvasStrategy.ts`
**File**: `packages/renderer/src/strategies/CanvasStrategy.ts`
**What to change**:
In `getFFmpegArgs`, apply the same removal.

```typescript
    const videoInputArgs = [
      '-f', inputFormat,
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];
```

**Why**: Relying on native Unix pipe backpressure reduces thread switching and synchronization overhead within the FFmpeg process, potentially decreasing the overall pipeline latency for deterministic frame streams.
**Risk**: If FFmpeg blocks for too long, Node.js stream will pause. But `CaptureLoop.ts` handles backpressure correctly via the `drain` promise.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.
