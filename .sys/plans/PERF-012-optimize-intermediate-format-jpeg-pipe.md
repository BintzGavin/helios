---
id: PERF-012
slug: optimize-intermediate-format-jpeg-pipe
status: complete
claimed_by: "executor-session"
created: 2026-10-18
completed: 2026-10-18
result: failed
---

# PERF-012: Optimize FFmpeg Image Pipe Format

## Context & Goal
The `DomStrategy` uses `Page.captureScreenshot` via CDP to push frames over IPC to Node, and then to FFmpeg using the `image2pipe` demuxer. In `PERF-011`, the intermediate format was successfully changed to `jpeg` for non-alpha streams. Currently, `getFFmpegArgs` specifies `-f image2pipe` for all inputs. The `image2pipe` format requires FFmpeg to probe the incoming stream to determine the codec type, adding overhead for each frame. FFmpeg supports explicit stream formats, such as `jpeg_pipe`, which bypasses probing and forces the `mjpeg` codec for decoding.
The goal is to modify `DomStrategy` to conditionally output `-f jpeg_pipe` and `-vcodec mjpeg` instead of `-f image2pipe` when the selected intermediate image format is `jpeg`, reducing CPU overhead during the FFmpeg ingest phase.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Step 1: Conditionally use `jpeg_pipe` in `getFFmpegArgs`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `DomStrategy.ts`, locate the `getFFmpegArgs` method. Modify the `videoInputArgs` array generation to detect the format.
- Use the same logic from `capture()` to determine the format:
  ```typescript
  const pixelFormat = options.pixelFormat || 'yuv420p';
  const hasAlpha = pixelFormat.includes('yuva') ||
                   pixelFormat.includes('rgba') ||
                   pixelFormat.includes('bgra') ||
                   pixelFormat.includes('argb') ||
                   pixelFormat.includes('abgr');
  let format = options.intermediateImageFormat;
  if (!format) {
    format = hasAlpha ? 'png' : 'jpeg';
  }
  ```
- If `format === 'jpeg'`, set `videoInputArgs` to:
  ```typescript
  const videoInputArgs = [
    '-f', 'jpeg_pipe',
    '-vcodec', 'mjpeg',
    '-framerate', `${options.fps}`,
    '-i', '-',
  ];
  ```
- Otherwise, keep the existing `image2pipe` fallback:
  ```typescript
  const videoInputArgs = [
    '-f', 'image2pipe',
    '-framerate', `${options.fps}`,
    '-i', '-',
  ];
  ```

**Why**: Bypassing FFmpeg stream probing with explicit format mappings (`jpeg_pipe` + `mjpeg`) reduces CPU cycles, lowering the total wall-clock time in a CPU-bound environment.
**Risk**: Low. Local testing explicitly verifies the installed FFmpeg version supports `-f jpeg_pipe -vcodec mjpeg`.

## Test Plan
1. Run a standard Canvas smoke test by executing `npx tsx tests/run-all.ts` inside the `packages/renderer` directory.
2. Execute the DOM render benchmark and measure if wall-clock time improves compared to the PERF-011 baseline (46.706s).

## Results Summary
- **Best render time**: 46.706s (vs baseline 46.706s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [jpeg_pipe ingest via mjpeg codec]