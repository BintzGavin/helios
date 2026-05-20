---
id: PERF-553
slug: ffmpeg-probesize
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-553: FFmpeg Input Stream Probesize Optimization

## Focus Area
`DomStrategy.ts` - FFmpeg input arguments.

## Background Research
When FFmpeg starts, it reads a portion of the input stream to detect stream properties (resolution, codec, timebase, etc.) before it begins decoding and encoding.
Because we explicitly declare `-f image2pipe` (or `mjpeg`), `-framerate`, and pipe a deterministic sequence of images, FFmpeg does not need to analyze the input stream deeply. The default `probesize` is 5,000,000 bytes.
By passing `-probesize 32` and `-analyzeduration 0` to the input arguments, we force FFmpeg to immediately assume the stream properties based on our explicit arguments and the first frame, bypassing the analysis phase. This can eliminate initial pipeline stalls that cause the backpressure ring buffer to fill up prematurely.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: Initial FFmpeg pipeline stalls due to stream probing.

## Implementation Spec

### Step 1: Add `-probesize 32` and `-analyzeduration 0` to FFmpeg video input arguments
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add `'-probesize', '32'` and `'-analyzeduration', '0'` to the `videoInputArgs` array in `getFFmpegArgs`.
**Why**: Forces FFmpeg to immediately start encoding without analyzing 5MB of input stream.
**Risk**: If the incoming base64 decoded buffer doesn't have sufficient headers in the first 32 bytes to identify image dimensions, FFmpeg might throw an error. However, standard PNGs and JPEGs contain their dimension headers very early.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` and verify `verify-canvas-strategy.ts` passes.

## Correctness Check
Run `npm run test -w packages/renderer -- --run` to ensure all DOM rendering verification tests pass.