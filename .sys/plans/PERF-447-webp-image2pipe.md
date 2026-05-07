---
id: PERF-447
slug: webp-image2pipe
status: complete
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-447: Use WebP with image2pipe for Intermediate Formats

## Focus Area
DOM Rendering phase 4: Frame Capture Loop (`DomStrategy.ts`).

## Background Research
Currently, `DomStrategy` uses PNG format for DOM screenshots, which incurs high IPC payload transfer sizes and Node.js encoding overhead compared to WebP. Previous experiments (PERF-441/443/445) attempted to change the intermediate format to WebP with `webp_pipe`, but resulted in `pipe:: Invalid argument` crashes because FFmpeg couldn't correctly parse WebP frames sequentially without a container format.

However, according to FFmpeg documentation, the `image2pipe` demuxer natively supports reading sequential images of various formats, including WebP, over a pipe if explicitly configured with the appropriate video codec input flag (`-vcodec webp`). Using WebP format in Chromium is significantly faster for screenshot generation, and transferring base64 WebP over IPC is much lighter on memory and CPU. Setting quality to 50 provides a great balance of speed over lossy compression for purely performance-focused benchmarks.

## Benchmark Configuration
- **Composition URL**: `dom-benchmark`
- **Render Settings**: 1280x720, 30fps, 3s duration (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~42.58s
- **Bottleneck analysis**: Generating and transferring full-resolution PNG frames over CDP IPC involves heavy memory allocation and transfer overhead in V8 and Node.js.

## Implementation Spec

### Step 1: Default to WebP for All Renders
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, change the fallback logic so that if no format is provided, `webp` is always used (with quality 50 for non-alpha to optimize speed).

```typescript
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'webp';
        quality = quality ?? 50;
      }
    }
```

### Step 2: Use `image2pipe` and `-vcodec webp` for FFmpeg
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `getFFmpegArgs()`, force `inputFormat = 'image2pipe'` for `webp`, and prepend `-vcodec webp` to the video input arguments.

```typescript
    if (format === 'webp') {
      inputFormat = 'image2pipe';
    } else if (format === 'jpeg') {
      inputFormat = 'mjpeg';
    } else if (format === 'png') {
       inputFormat = 'image2pipe';
    }

    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', `${options.fps}`,
      '-thread_queue_size', '512',
      '-i', '-',
    ];
```
**Why**: `image2pipe` correctly frames and decodes continuous image streams (including WebP) when hinted with `-vcodec webp`, avoiding the `webp_pipe` EOF parsing crash.

## Variations
None.

## Canvas Smoke Test
Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js --mode canvas` to ensure Canvas strategy still works.

## Correctness Check
Run the DOM render benchmark script (`npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js`) to verify it doesn't crash and actually produces a speedup.

## Prior Art
- PERF-441, PERF-445: Both crashed because they tried using `webp_pipe`. This plan specifically fixes the FFmpeg demuxer configuration to use `image2pipe` with `-vcodec webp`.

## Results Summary

```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	0.000	0	0.00	0.0	crash	Use WebP with image2pipe and -vcodec webp
```
