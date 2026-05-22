---
id: PERF-566
slug: webp-pipe-demuxer
status: unclaimed
claimed_by: ""
created: 2024-05-22
completed: ""
result: ""
---

# PERF-566: Use webp_pipe Demuxer for WEBP Intermediate Format

## Focus Area
`DomStrategy.ts` allows configuring the intermediate image format via `RendererOptions`. Currently, when `format === 'webp'`, it configures FFmpeg to use the `-f image2pipe` demuxer and `-vcodec webp`. However, piping base64-decoded WEBP frames into `image2pipe` can lead to crashes or decoding failures in FFmpeg. This experiment plans to use the `webp_pipe` demuxer instead, which is specifically designed to handle a continuous stream of WEBP frames over stdin.

## Background Research
When Chromium captures DOM screenshots using `HeadlessExperimental.beginFrame`, it can return WEBP format images. These WEBP chunks are base64 decoded and sent over Node.js IPC to FFmpeg's `stdin`. FFmpeg's `image2pipe` demuxer tries to automatically determine the boundary of images, but it often fails with WEBP, resulting in pipeline crashes or dropped frames. By using `-f webp_pipe`, FFmpeg explicitly knows to read a concatenated stream of WEBP images, which resolves decoding issues and allows us to benchmark WEBP as a potentially faster intermediate format with alpha channel support compared to PNG.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/`
- **Render Settings**: 150 frames, dom mode, `--intermediate-image-format webp`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A (WEBP mode crashes with `image2pipe`)
- **Bottleneck analysis**: The pipeline fails before completing the render, so we must fix the crash to measure WEBP performance.

## Implementation Spec

### Step 1: Use `webp_pipe` Demuxer
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `getFFmpegArgs` method, modify the format check for 'webp' to set `inputFormat = 'webp_pipe';` instead of `image2pipe`.
**Why**: This resolves the FFmpeg decoding crash when feeding a stream of WEBP frames over stdin.
**Risk**: If FFmpeg in the current environment doesn't support `webp_pipe`, the render will still fail.

## Variations
### Variation A: Keep `-vcodec webp`
If `-f webp_pipe` alone is insufficient, maintain the `...(format === 'webp' ? ['-vcodec', 'webp'] : [])` in `videoInputArgs` alongside `-f webp_pipe`.

## Canvas Smoke Test
N/A - this only affects `DomStrategy` with `webp` intermediate format.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure baseline rendering is not broken, and run a manual test with WEBP format to ensure it completes without crashing.
