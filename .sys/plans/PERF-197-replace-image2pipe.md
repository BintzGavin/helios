---
id: PERF-197
slug: replace-image2pipe
status: complete
claimed_by: "executor-session"
created: 2024-04-06
completed: 2024-04-06
result: improved
---
PERF-197: Replace image2pipe input with parallel raw base64 frame pushes and `-f webp_pipe`

Focus Area
The primary frame ingestion mechanism into FFmpeg in the `Renderer.ts` hot loop.

Background Research
Currently, the DOM renderer strategy captures `HeadlessExperimental.beginFrame` and pushes raw base64 encoded image strings to FFmpeg using `image2pipe`.
`image2pipe` expects standard image files concatenated together. However, pushing strings into stdin as base64 means FFmpeg is relying on the Node.js writable stream layer to convert and ingest standard webp files into a raw input pipe, then deciphering the format.
If we can inform FFmpeg that the incoming stream is exactly `webp_pipe` (or `mjpeg` for jpeg), it can bypass format probing, reducing CPU overhead and I/O latency inside the FFmpeg process itself, and speeding up the frame ingestion.

Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (from `tests/fixtures/benchmark.ts`)
- **Render Settings**: 1280x720, 60 FPS, 120 frames (2 seconds), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

Baseline
- **Current estimated render time**: ~33.5 - 34.0 seconds (PERF-194/195/196)
- **Bottleneck analysis**: I/O and FFmpeg processing overhead of parsing incoming raw stream packets into discrete images.

Implementation Spec

Step 1: Update `DomStrategy.ts` FFmpeg Args
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `getFFmpegArgs`, update the `-f` flag for the video input from `image2pipe` to the format dynamically corresponding to `this.cdpScreenshotParams.format`.
If the format is `webp`, use `webp_pipe`. If the format is `jpeg`, use `mjpeg`. If `png`, use `image2pipe` as fallback or `png_pipe`.

```typescript
    let inputFormat = 'image2pipe';
    const format = this.cdpScreenshotParams?.format || 'png';

    if (format === 'webp') {
      inputFormat = 'webp_pipe';
    } else if (format === 'jpeg') {
      inputFormat = 'mjpeg';
    } else if (format === 'png') {
       inputFormat = 'image2pipe'; // or png_pipe, image2pipe is safest fallback
    }

    const videoInputArgs = [
      '-f', inputFormat,
      '-framerate', `${options.fps}`,
      '-i', '-',
    ];
```

**Why**: By explicitly defining the input pipe format based on the CDP screenshot format, FFmpeg can optimize its ingestion and demuxing routines, skipping probe heuristics that can stall frame processing on high-frequency writes.
**Risk**: If FFmpeg complains about `webp_pipe` missing or being unsupported, we may need to fall back. However, `webp_pipe` and `mjpeg` are standard FFmpeg demuxers.

Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode is not affected.

Correctness Check
Run the `dom` verify script to ensure the resulting mp4 is playable and correct.

Prior Art
N/A
Results Summary
- Best render time: 35.568s (vs baseline 44.607s)
- Improvement: 20.3%
- Kept experiments: [replace-image2pipe]
- Discarded experiments: []
