---
id: PERF-200
slug: ffmpeg-ultrafast
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---
# PERF-200: FFmpeg Codec Tuning (ultrafast)

## Focus Area
FFmpeg Encoding (Phase 5 of the DOM pipeline).

## Background Research
Currently, when `videoCodec` is `libx264` (the default) and no `preset` is provided in the `RendererOptions`, FFmpeg falls back to its default preset (`medium`). On a CPU-only microVM like Jules, video encoding dominates the final phase of the render loop and can cause the capture pipeline to stall if FFmpeg cannot keep up with the incoming `image2pipe` stream, even with a large `thread_queue_size`.
Changing the default preset to `ultrafast` reduces CPU cycles spent on motion estimation and reference frame analysis, significantly improving wall-clock render time at the expense of a slightly larger output file size or lower quality. The prompt explicitly suggests `FFmpeg optimizations: Codec tuning (ultrafast preset, CRF tradeoffs)`.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (`file:///app/examples/simple-animation/composition.html`)
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.3s
- **Bottleneck analysis**: FFmpeg CPU encode limits on `medium` preset.

## Implementation Spec

### Step 1: Default to ultrafast preset for libx264
**File**: `packages/renderer/src/utils/FFmpegBuilder.ts`
**What to change**:
Modify the video encoding arguments builder to check if `options.preset` is undefined. If undefined, and the codec supports it (e.g., `libx264`), append `-preset ultrafast` to the final FFmpeg arguments array.
**Why**: Using the `ultrafast` preset minimizes FFmpeg's CPU usage per frame, reducing overall encode time and unblocking the Node.js IPC hot loop faster.
**Risk**: Larger file size for the output video. However, the objective is the lowest wall-clock DOM render time, so this tradeoff is acceptable.

## Variations
### Variation A: Tune CRF
If `ultrafast` degrades quality too much to be usable, explicitly add `-crf 28` to the options to balance the quality/speed tradeoff.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid `.mp4` file.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.
