---
id: PERF-441
slug: webp-intermediate-format
status: unclaimed
claimed_by: ""
created: 2025-05-24
completed: ""
result: ""
---

# PERF-441: Use WebP with Low Quality for All Intermediate Formats

## Focus Area
DOM Rendering phase 4: Strategy Preparation (`DomStrategy.ts`).

## Background Research
Currently, `DomStrategy` defaults to `png` for non-alpha formats and only uses `webp` if an alpha channel is detected or if specifically requested. From `PERF-346`, `jpeg` was found to be slower than `png` due to Chromium software encoding overhead in the headless environment without hardware acceleration. However, `webp` encoding at low quality settings (e.g., 50-75) in Chromium is extremely fast and produces significantly smaller IPC payloads than `png`. Since the intermediate frame is immediately piped to FFmpeg (via `webp_pipe`), the decoding overhead in FFmpeg is minimal, and the IPC bottleneck between V8 and Node.js can be reduced. Changing the default intermediate format to `webp` at `quality: 50` for ALL renders (alpha and non-alpha) could provide a net speedup by reducing V8 GC pressure and IPC transfer times compared to uncompressed/lossless `png`.

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

### Step 1: Update Default Format in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, change the default `format` from `'png'` to `'webp'` when no format is specified.
Set the default `quality` to `50` (or leave it at 75 if 50 degrades visual quality too much for the benchmark, but 50 is best for speed testing).

```typescript
    let format = this.options.intermediateImageFormat;
    let quality = this.options.intermediateImageQuality;

    if (!format) {
      format = 'webp';
      quality = quality ?? 50;
    }
```
**Why**: WebP at lower quality encodes faster than PNG and produces smaller IPC payloads, reducing memory overhead in Node.js buffer allocations.
**Risk**: WebP decoding in FFmpeg via `webp_pipe` might consume more CPU than `image2pipe` (PNG), but the V8/IPC savings should outweigh it.

## Correctness Check
Run the `scripts/benchmark-test.js` script to ensure FFmpeg correctly handles `webp_pipe` for non-alpha inputs and doesn't crash.

## Prior Art
- PERF-346: Found JPEG slower than PNG, but WebP wasn't evaluated as a global default.
