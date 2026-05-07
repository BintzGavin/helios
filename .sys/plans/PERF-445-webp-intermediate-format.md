---
id: PERF-445
slug: webp-intermediate-format
status: unclaimed
claimed_by: ""
created: 2025-05-24
completed: ""
result: ""
---

# PERF-445: Use WebP with Low Quality for All Intermediate Formats

## Context & Goal
Currently, `DomStrategy` defaults to `png` for non-alpha formats.
From `PERF-441` logs, using `webp_pipe` for raw frames fails over STDIN without container markers in FFmpeg. However, when we specify `-vcodec webp` inside `getFFmpegArgs` for the `image2pipe` demuxer, FFmpeg successfully reads raw WebP frames sent sequentially over stdin.
We will change the default intermediate format to `webp` at `quality: 50`. This utilizes WebP's much faster Chromium encoding and smaller IPC transfer size, providing a noticeable speedup over `png` while preventing FFmpeg crashes.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec
### Architecture
Update `DomStrategy.ts` to use WebP at quality 50 as the default intermediate format. Update FFmpeg args to use `image2pipe` with `-vcodec webp` instead of `webp_pipe`.

### Pseudo-Code
In `prepare()`:
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
In `getFFmpegArgs()`:
```typescript
    if (format === 'webp') {
      inputFormat = 'image2pipe';
      // ...
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', `${options.fps}`,
      // ...
```

### Public API Changes
None.

### Dependencies
None.

## Test Plan
- Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js` to verify FFmpeg handles the stream and performance is benchmarked.
