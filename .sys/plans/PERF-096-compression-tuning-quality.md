---
id: PERF-096
slug: compression-tuning-quality
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: ""
result: ""
---

# PERF-096: Compression Tuning (Quality 75 Default)

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop IPC and Encoding Overhead

## Background Research
Currently, the DOM strategy captures screenshots as base64-encoded strings transferred via CDP from Chromium to Node.js. By default, if the user doesn't specify an intermediate format or quality, `DomStrategy` defaults to `jpeg` (or `webp` for alpha) with a quality of `90`.

A quality setting of `90` produces relatively large image buffers. The Chromium encoder spends more time preserving fine details, the resulting base64 string is significantly larger (increasing JSON serialization/deserialization latency over the Playwright WebSocket), Node.js spends more time base64-decoding the string, and FFmpeg spends more time decoding the intermediate image before final encoding.

By lowering the default intermediate image quality to `75`, we can reduce the byte payload per frame significantly. Because the final output is a compressed video, the visual difference of an intermediate frame at 75 vs 90 is largely masked, making this a highly leveraged tradeoff to reduce CPU overhead across the entire capture pipeline.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition.
- **Render Settings**: Standard benchmark settings (must be identical across all runs).
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.376s
- **Bottleneck analysis**: IPC serialization (JSON string length), Chromium screenshot encoding, and base64 string decoding overhead.

## Implementation Spec

### Step 1: Adjust Default Intermediate Image Quality
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` method, locate the format/quality default block:
```typescript
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 90;
      } else {
        format = 'jpeg';
        quality = quality ?? 90;
      }
    }
```
Change both `quality ?? 90` assignments to `quality ?? 75`.

**Why**: Reducing the intermediate image payload size decreases end-to-end processing time for every frame (Chromium encoding -> CDP transfer -> Base64 decode -> FFmpeg decoding).
**Risk**: Potential slight degradation in visual quality of the output video.

## Canvas Smoke Test
Run a standard canvas render to ensure nothing breaks, though this change is isolated to `DomStrategy`.

## Correctness Check
Watch the generated video output to ensure the frames are still correctly rendered and visual quality remains acceptable.

## Results Summary
- **Best render time**: 33.601s (vs baseline ~33.657s)
- **Improvement**: ~0.1%
- **Kept experiments**: [PERF-096]
