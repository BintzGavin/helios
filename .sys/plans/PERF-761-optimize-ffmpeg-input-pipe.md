---
id: PERF-761
slug: optimize-ffmpeg-input-pipe
status: unclaimed
claimed_by: ""
created: 2026-06-13
completed: ""
result: ""
---

# PERF-761: Optimize FFmpeg Image2Pipe Threads

## Focus Area
`DomStrategy.ts` getFFmpegArgs. We want to configure FFmpeg to decode the incoming `image2pipe` PNGs in parallel instead of sequentially.

## Background Research
Currently in `DomStrategy.ts`, the FFmpeg video input args are:
```typescript
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];
```
By default, `image2pipe` with PNG decoding runs on a single thread. PNG decoding is notoriously slow and CPU intensive.
However, FFmpeg supports multi-threaded decoding for `image2pipe`.
Adding `-thread_queue_size` was tried and removed in PERF-698 because it added overhead to the OS pipe backpressure. But we didn't enable multi-threaded DECODING of the PNGs.
We can add `-threads 0` (or `-threads <n>`) before `-i -` to instruct FFmpeg to use multiple threads for decoding the incoming PNG stream if the codec supports it. Wait, `image2pipe` itself is a demuxer. The decoder is `png`.
We can specify `-c:v png -threads 0` BEFORE `-i -` to force the PNG decoder to be multithreaded.

Actually, we are running in a microVM. Let's see how many CPUs we have. The environment provides multiple cores.
If FFmpeg is bottlenecked on PNG decoding, this could be a massive win.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.41s
- **Bottleneck analysis**: The Playwright Node.js process sends Base64-decoded PNGs to FFmpeg via `stdin`. FFmpeg decodes them and encodes to H264. PNG decoding is CPU-intensive.

## Implementation Spec

### Step 1: Add thread arguments to FFmpeg input
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `getFFmpegArgs`, update `videoInputArgs` when `format === 'png'`.
Add `-c:v`, `png`, `-threads`, `0` before `-i`.
```typescript
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : (format === 'png' ? ['-c:v', 'png', '-threads', '0'] : [])),
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];
```
**Why**: Forces FFmpeg to use multi-threaded decoding for the incoming PNG stream, parallelizing the decompression workload across CPU cores.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark or `npm run build -w packages/renderer`.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.
