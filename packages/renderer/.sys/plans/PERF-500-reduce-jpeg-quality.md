---
id: PERF-500
slug: reduce-jpeg-quality
status: unclaimed
claimed_by: ""
created: 2024-05-13
completed: ""
result: ""
---

# PERF-500: Reduce Default JPEG Intermediate Quality

## Focus Area
DOM Capture Pipeline (`DomStrategy.ts`). Specifically targeting the reduction of CDP IPC payload sizes and Node.js Base64 decoding bottlenecks by lowering the intermediate JPEG quality.

## Background Research
The DOM rendering path is purely CPU-bound in the Jules microVM. A significant portion of per-frame render time is spent in Chromium encoding the 1080p frame to JPEG, base64 encoding it, transferring it over Playwright's CDP pipe, and having Node.js decode that base64 payload into a Buffer before piping it to FFmpeg.
By default, `DomStrategy` falls back to the `jpeg` format with a quality of `90` for compositions without alpha channels. A 1080p JPEG at quality 90 is typically 150-250KB, creating significant per-frame overhead.
Reducing the quality to `50` for the intermediate pipe drastically reduces the frame size (down to 50-80KB), which directly cuts down:
1. Chromium's intra-process JPEG encoding CPU time.
2. Base64 payload string allocation and IPC transfer overhead.
3. Node.js `Buffer.from(base64)` decoding times.
Because FFmpeg later transcodes this stream using a visually lossless preset (e.g., `crf=23` or ultrafast), the slight artifacting from a `50` quality intermediate frame is rarely noticeable in the final H.264 mp4 output, but the render speedups can be profound.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.4s - 18.2s for 600 frames
- **Bottleneck analysis**: IPC payload size and base64 parsing overhead inside the V8 engine due to high-quality intermediate images.

## Implementation Spec

### Step 1: Reduce Default JPEG Quality
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` method, locate the format fallback logic for the `quality` parameter and change it from defaulting to 90 to defaulting to 50.

Replace:
`quality = quality ?? 90;`
With:
`quality = quality ?? 50;`

**Why**: Reducing intermediate JPEG quality dramatically lowers the Base64 payload size sent over the CDP pipe, reducing intra-browser encoding time, JSON parsing time in Node.js, and Buffer allocation time.

**Risk**: Slight degradation in visual quality of the output mp4 if `50` produces excessive artifacts that survive the FFmpeg transcode.

## Correctness Check
Run the `simple-animation` benchmark and inspect the `output.mp4` to ensure it is visually acceptable.

## Canvas Smoke Test
Run a basic canvas test to ensure the shared codebase is not broken.
