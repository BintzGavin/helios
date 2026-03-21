---
id: PERF-020
slug: ffmpeg-image-pipe-format
status: unclaimed
claimed_by: ""
created: 2026-03-21
completed: ""
result: ""
---

# PERF-020: Optimize FFmpeg Image Pipe Format

## Context & Goal
The frame capture loop currently pipes frames to FFmpeg using the `image2pipe` format. The intermediate images are typically `webp` or `jpeg`. FFmpeg's `image2pipe` demuxer has to probe each frame to determine its format. Since we strictly control the intermediate image format, we can explicitly specify the video codec (e.g. `webp` or `mjpeg`) for the input stream. This bypasses the stream probing phase in FFmpeg for every single frame and may reduce CPU overhead during ingestion, thus slightly improving the DOM rendering pipeline performance.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Step 1: Explicitly specify input codec for intermediate format
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the function where FFmpeg arguments are generated for DOM Strategy, modify the video input arguments.

Determine the active intermediate image format. If the format resolves to `webp`, add `-vcodec webp` to the video input arguments before the input `-i -`. If it resolves to `jpeg`, add `-vcodec mjpeg`. Replicate the existing format resolution logic (e.g., checking if the pixel format has alpha) to know which format is actually being used.
**Why**: Explicitly telling FFmpeg the codec of the incoming stream eliminates the need for FFmpeg to probe the image header on every frame.
**Risk**: Low. The format is strictly controlled by our code. Here, we keep `image2pipe` but add `-vcodec webp` or `-vcodec mjpeg`, avoiding container-level probing issues while still skipping codec probing.

## Test Plan
1. Run `npx tsx tests/verify-codecs.ts` inside `packages/renderer` to ensure codec verifications still pass.
2. Execute the DOM rendering benchmark using `time npx tsx packages/renderer/scripts/render-dom.ts > benchmark.log 2>&1` to measure the wall-clock render time and verify output video correctness.