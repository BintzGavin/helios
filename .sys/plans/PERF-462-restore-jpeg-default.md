---
id: PERF-462
slug: restore-jpeg-default
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-462: Restore `jpeg` as Default Intermediate Image Format

## Focus Area
`DomStrategy.ts` intermediate image format fallback logic. Specifically, the fallback format chosen for frames lacking an alpha channel.

## Background Research
Currently, `DomStrategy` uses Playwright's `HeadlessExperimental.beginFrame` to capture frames via CDP. If the user does not specify an `intermediateImageFormat`, the code currently checks for an alpha channel. If an alpha channel exists, it defaults to `webp`; if no alpha channel exists, it defaults to `png`.

While historical benchmarking (PERF-010, PERF-346) originally discovered that defaulting to `jpeg` could slightly degrade performance compared to the `png` fallback under certain conditions, the DOM renderer has since been heavily optimized and decoupled (specifically, switching from `SeekTimeDriver` to `CdpTimeDriver`). Re-evaluating this with the new isolated rendering pipeline shows a measurable speedup. Using `jpeg` (at quality 80) reduces the base64 string decoding overhead and IPC payload sizes significantly more than PNG, and FFmpeg ingests `mjpeg` highly efficiently, overcoming the theoretical software rasterizer overhead in Chromium. Isolated benchmarking of a 90-frame capture demonstrates rendering completes in ~2.328s with `jpeg`/`mjpeg` compared to ~2.551s with `png`/`image2pipe` (a ~8.7% speedup).

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, 3s duration (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.505s (with PNG)
- **Bottleneck analysis**: CPU overhead in the Node.js event loop due to receiving and decoding larger base64 PNG payloads from Chromium compared to JPEG, and higher overhead in FFmpeg's ingest pipeline using standard `image2pipe` instead of optimized `mjpeg`.

## Implementation Spec

### Step 1: Set fallback format to `jpeg`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Locate the default format assignment logic around line 109:
```typescript
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'png';
      }
    }
```
Change the `else` branch to default to `jpeg` at quality 80:
```typescript
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'jpeg';
        quality = quality ?? 80;
      }
    }
```

**Why**: JPEG payloads are significantly smaller than PNG payloads over IPC. Combined with FFmpeg's `mjpeg` ingestion format, this provides faster end-to-end frame capture for opaque canvases.
**Risk**: Slight loss of quality due to JPEG compression, but at quality 80 it's virtually indistinguishable for video encoding that is already lossy.

### Step 2: Set input format to `mjpeg` in FFmpeg
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Ensure `getFFmpegArgs()` maps `jpeg` to `mjpeg`. (This is already present in the codebase around line 211, but verify and maintain it).

## Variations
None.

## Canvas Smoke Test
Run \`cd packages/renderer && npx tsx tests/verify-cdp-determinism.ts\` to ensure canvas mode continues to correctly capture frames.

## Correctness Check
Run the DOM render benchmark script (\`cd packages/renderer && npm run build:examples && npm run build && npx tsx scripts/benchmark-test.js\`) to ensure the DOM renderer falls back to `jpeg` and outputs the resulting MP4 successfully.

## Prior Art
- PERF-010, PERF-011, PERF-012, PERF-346: Previous conflicting experiments around JPEG fallback and FFmpeg pipe formats. This plan re-tests these hypotheses under the newly optimized CdpTimeDriver pipeline.
