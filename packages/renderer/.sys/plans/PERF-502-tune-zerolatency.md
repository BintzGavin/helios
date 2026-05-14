---
id: PERF-502
slug: tune-zerolatency
status: unclaimed
claimed_by: ""
created: 2024-05-14
completed: ""
result: ""
---

# PERF-502: Optimize FFmpeg Args for Zero-Latency Output

## Focus Area
DOM and Canvas Capture Pipelines (`FFmpegBuilder.ts`). Specifically targeting the reduction of FFmpeg buffering and latency by adding the `-tune zerolatency` argument for `libx264` and `libx265` codecs.

## Background Research
The `CaptureLoop` acts as a multi-worker actor model to rapidly capture frames from Playwright and write them to the `FFmpeg` standard input pipe. `FFmpeg` encodes these incoming chunks. When writing MP4 files, `FFmpeg` attempts to buffer frames to find the optimal encoding strategy. We previously added `-movflags +faststart` to move the MOOV atom, but when the capture loop drives inputs sequentially, the encoder thread can still experience buffering delays, blocking the standard input pipe and causing backpressure to propagate up into Node.js, pausing the capture loop.

Adding `-tune zerolatency` to the `libx264` (and `libx265`) presets drastically cuts down FFmpeg's internal frame queueing. It forces the encoder to process and flush frames as soon as they arrive over the pipe. In a purely CPU-bound environment like the Jules microVM, reducing encoder latency allows the Playwright capture loop to offload the frame buffer to the pipe immediately, minimizing IPC and microtask stalls in V8.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~19.5s
- **Bottleneck analysis**: FFmpeg input buffering causing backpressure to the Playwright capture loop.

## Implementation Spec

### Step 1: Add `-tune zerolatency` argument
**File**: `packages/renderer/src/utils/FFmpegBuilder.ts`
**What to change**:
In the `getArgs` method, modify the argument builder where the `-movflags +faststart` flag is applied for transcoding video codecs.

Replace the string:
`'-movflags', '+faststart',`
With:
`'-movflags', '+faststart', '-tune', 'zerolatency',`

You can use the following sed command:
```bash
sed -i "s/'-movflags', '+faststart',/'-movflags', '+faststart', '-tune', 'zerolatency',/g" packages/renderer/src/utils/FFmpegBuilder.ts
```

**Why**: `-tune zerolatency` instructs the x264/x265 encoder to minimize internal frame buffering, ensuring incoming frames from the pipe are processed and flushed as quickly as possible. This reduces backpressure on the Node.js pipe writer and allows the DOM capture loop to advance faster.

**Risk**: Negligible impact on output file size or quality for most use cases, but it may disable some advanced lookahead optimizations in x264. This is an acceptable tradeoff for raw render speed, particularly since users can customize options if needed.

## Correctness Check
Run the `simple-animation` benchmark and inspect the `output.mp4` to ensure it plays correctly and is visually acceptable.

## Canvas Smoke Test
Run a basic canvas test to ensure the shared codebase is not broken.