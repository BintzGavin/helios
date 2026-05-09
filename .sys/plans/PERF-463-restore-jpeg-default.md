---
id: PERF-463
slug: restore-jpeg-default
status: unclaimed
claimed_by: ""
created: 2024-05-09
completed: ""
result: ""
---

# PERF-463: Use JPEG by default for non-alpha frames

## Focus Area
DOM Strategy Capture Pipeline (Phase 4)

## Background Research
The DOM render pipeline uses `DomStrategy.ts` to capture frames via Chromium CDP `HeadlessExperimental.beginFrame`. When frames do not have an alpha channel, it defaults to using `png` as the intermediate format. Encoding raw PNGs inside the browser and transferring them over IPC takes more time compared to `jpeg`.

A standalone scratchpad test using `jpeg` instead of `png` as the default fallback in `DomStrategy.ts` showed a performance improvement:
* `png` baseline: ~4.51s
* `jpeg` test run: ~3.18s

`jpeg` uses `mjpeg` as input for `image2pipe` in FFmpeg, which is fully supported by the pipeline.

## Benchmark Configuration
- **Composition URL**: Default `dom-benchmark` composition
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~4.51s
- **Bottleneck analysis**: The intermediate `png` encoding overhead within `HeadlessExperimental.beginFrame` and node.js base64 decode processing of heavier `png` strings.

## Implementation Spec

### Step 1: Default to JPEG for non-alpha frames
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` function, change the fallback format for frames without alpha from `png` to `jpeg` with a default quality of `80`.

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
**Why**: JPEG compresses frames significantly faster in Chromium and reduces the base64 string length passed over IPC compared to PNG, speeding up the hot capture loop.
**Risk**: Negligible. JPEG is officially supported via `mjpeg` format in the pipeline.

## Variations
None.

## Canvas Smoke Test
Run `npm run build:examples && npx tsx packages/renderer/scripts/render-canvas.ts` (or run tests directly)

## Correctness Check
Verify `packages/renderer/output/dom-animation.mp4` renders successfully and looks correct visually.

## Prior Art
PERF-454, PERF-462 (which were unexecuted duplicates in memory). This formally re-establishes the plan.
