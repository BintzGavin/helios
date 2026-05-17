---
id: PERF-535
slug: webp-image2pipe
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-535: Use WebP with image2pipe for Intermediate Formats

## Focus Area
DOM Rendering phase 4: Frame Capture Loop (`DomStrategy.ts`).

## Background Research
Currently, `DomStrategy` uses JPEG/PNG for DOM screenshots, which incurs high IPC payload transfer sizes and Node.js encoding overhead compared to WebP. Previous experiments (PERF-441/443/445) attempted to change the intermediate format to WebP with `webp_pipe`, but resulted in crashes because FFmpeg couldn't correctly parse WebP frames sequentially without a container format. However, according to FFmpeg documentation, the `image2pipe` demuxer natively supports reading sequential images of various formats, including WebP, over a pipe if explicitly configured with the appropriate video codec input flag (`-vcodec webp`). Using WebP format in Chromium is significantly faster for screenshot generation, and transferring base64 WebP over IPC is much lighter on memory and CPU. Setting quality to 50 provides a great balance of speed over lossy compression for purely performance-focused benchmarks.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.594s
- **Bottleneck analysis**: Generating and transferring full-resolution frames over CDP IPC involves memory allocation and transfer overhead in V8 and Node.js.

## Implementation Spec

### Step 1: Default to WebP for All Renders
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Change the fallback logic so that if no format is provided, `webp` is always used (with quality 50 for non-alpha).

```typescript
<<<<<<< SEARCH
    if (!format) {
      if (hasAlpha) {
        format = 'png';
      } else {
        format = 'jpeg';
        quality = quality ?? 90;
      }
    }
=======
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'webp';
        quality = quality ?? 50;
      }
    }
>>>>>>> REPLACE
```

### Step 2: Ensure proper configuration of `inputFormat` for `webp`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Ensure the logic configuring `inputFormat` based on `format` defaults to `image2pipe` when `webp` is selected. The current codebase already includes this logic, verified below.

```typescript
<<<<<<< SEARCH
    if (format === 'webp') {
      inputFormat = 'image2pipe';
    } else if (format === 'jpeg') {
      inputFormat = 'mjpeg';
    } else if (format === 'png') {
       inputFormat = 'image2pipe';
    }
=======
    if (format === 'webp') {
      inputFormat = 'image2pipe';
    } else if (format === 'jpeg') {
      inputFormat = 'mjpeg';
    } else if (format === 'png') {
       inputFormat = 'image2pipe';
    }
>>>>>>> REPLACE
```

**Why**: `image2pipe` correctly frames and decodes continuous image streams (including WebP) when hinted with `-vcodec webp`, avoiding the `webp_pipe` EOF parsing crash.
**Risk**: Visual degradation due to quality 50, but acceptable if it yields a significant speedup.

## Variations
- Variation A: Test with WebP quality 75 if 50 is too degraded.

## Canvas Smoke Test
Run canvas tests.

## Correctness Check
Run the benchmark script (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) to measure speedups. Then run the full test suite (`npm run test -w packages/renderer -- --run`) to verify correctness and ensure no functionality is broken.

## Prior Art
- PERF-447: Identified `image2pipe` with `-vcodec webp` as a solution to previous `webp_pipe` crashes.
