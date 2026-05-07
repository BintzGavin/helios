---
id: PERF-446
slug: webp-intermediate-format
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-446: Use WebP with Low Quality for All Intermediate Formats

## Context & Goal
Currently, `DomStrategy` defaults to `png` for non-alpha formats.
From `PERF-441` logs, using `webp_pipe` for raw frames fails over STDIN without container markers in FFmpeg. However, when we specify `-vcodec webp` inside `getFFmpegArgs` for the `image2pipe` demuxer, FFmpeg successfully reads raw WebP frames sent sequentially over stdin.
We will change the default intermediate format to `webp` at `quality: 50`. This utilizes WebP's much faster Chromium encoding and smaller IPC transfer size, providing a noticeable speedup over `png` while preventing FFmpeg crashes.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec
### Step 1: Update Default format in `DomStrategy.prepare()`
Modify the default intermediate image format for non-alpha streams to `webp` with a default `quality` of 50.

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

### Step 2: Use image2pipe demuxer and -vcodec webp
In `DomStrategy.getFFmpegArgs()`, force the input format to `image2pipe` for WebP instead of `webp_pipe`, and dynamically insert `-vcodec webp` into the video input arguments.

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

## Test Plan
- Run `npm install && npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js` to verify FFmpeg handles the stream and performance is benchmarked.
