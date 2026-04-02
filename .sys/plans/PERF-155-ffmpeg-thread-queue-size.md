---
id: PERF-155
slug: ffmpeg-thread-queue-size
status: unclaimed
claimed_by: ""
created: 2024-01-20
completed: ""
result: ""
---

# PERF-155: Optimize FFmpeg Ingestion via thread_queue_size

## Focus Area
FFmpeg input buffering and pipe read bottlenecks.

## Background Research
Currently, Node.js pipes frames directly to FFmpeg's `stdin` via `image2pipe`. If FFmpeg's reading thread for the input stream gets blocked due to encoding delays, backpressure builds up rapidly in the Node.js process, causing micro-stalls during the `captureLoop`. Increasing the `-thread_queue_size` for the input pipe allocates a larger internal buffer in FFmpeg to receive frames immediately even if the encoder thread is momentarily saturated. This can help decouple capture from encoding.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.057s
- **Bottleneck analysis**: IPC capture stalls waiting for pipe write buffer availability when FFmpeg lags.

## Implementation Spec

### Step 1: Add thread_queue_size to input arguments
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In `getFFmpegArgs`, update `videoInputArgs` to prepend `-thread_queue_size` `1024` before `-i`, `-`.
**Why**: Prevents FFmpeg input buffer overflows from stalling the Node.js write stream.
**Risk**: May increase memory consumption by FFmpeg significantly.

```typescript
<<<<<<< SEARCH
    const videoInputArgs = [
      '-f', 'image2pipe',
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];
=======
    const videoInputArgs = [
      '-f', 'image2pipe',
      '-framerate', `${options.fps}`,
      '-thread_queue_size', '1024',
      '-i', '-',
    ];
>>>>>>> REPLACE
```

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure `DomStrategy` instantiation and canvas basic modes remain unaffected.

## Correctness Check
Run benchmark tests via `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify video output is intact and no frames are dropped.

## Prior Art
No previous attempts documented for `thread_queue_size` in the microVM.
