---
id: PERF-004
slug: webp-intermediate-format
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-004: Intermediate Format Optimization (WEBP)

## Focus Area
The Frame Capture Loop (phase 4) in `packages/renderer/src/strategies/DomStrategy.ts`. The focus is on reducing the CPU overhead of encoding and decoding intermediate image frames during DOM capture.

## Background Research
Currently, Playwright's `page.screenshot()` defaults to generating PNGs. PNG encoding in Chromium and decoding in FFmpeg is extremely CPU-bound and generates large IPC payloads between the Chromium and Node.js processes. `webp` is a modern image format that supports transparency (like PNG) but offers significantly faster encoding/decoding and smaller file sizes, which reduces IPC overhead. Switching the default `intermediateImageFormat` to `webp` should reduce the per-frame capture time without sacrificing alpha channel support.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/default-dom-test`
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: TBD
- **Bottleneck analysis**: Profiling reveals that a significant portion of the capture loop time is spent waiting for `page.screenshot()`, which encodes a PNG. The size of the PNG buffer also adds overhead when passing it through Node.js to FFmpeg via `stdin`.

## Implementation Spec

### Step 1: Add webp support to types
**File**: `packages/renderer/src/types.ts`
**What to change**: Update the `intermediateImageFormat` property in `RendererOptions` to include `'webp'`.
**Why**: Allows users to specify `webp` as the format and makes it the internal type for default selection.
**Risk**: None.

### Step 2: Update DomStrategy default format
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In `capture(page: Page, frameTime: number)`, change the default format from `'png'` to `'webp'`. Also ensure that the `quality` parameter is passed to `screenshotOptions` if `format === 'webp'`, similar to `jpeg`.
**Why**: Defaulting to `webp` provides the performance benefits out of the box while retaining alpha channel capabilities.
**Risk**: Low. Playwright supports `type: 'webp'`. FFmpeg with `image2pipe` supports WebP inputs.

### Step 3: Update CanvasStrategy
**File**: `packages/renderer/src/strategies/CanvasStrategy.ts`
**What to change**: Ensure any fallback or relevant image capture logic in `CanvasStrategy` also defaults to or supports `webp` where appropriate for consistency.
**Why**: Consistency across strategies.
**Risk**: Low.

## Variations
### Variation A: JPEG for Opaque Contexts
If the composition does not require an alpha channel (e.g., the `pixelFormat` is `yuv420p`), try defaulting to `jpeg` instead of `webp`, as it might be even faster.

## Canvas Smoke Test
Run a standard Canvas smoke test. The changes should not negatively impact the Canvas path.

## Correctness Check
1. Ensure transparent backgrounds work correctly with `webp` (if the pixel format has an alpha channel).
2. Verify visual quality doesn't degrade noticeably (WebP is lossy by default, consider setting a high default quality if artifacts are visible, though speed is the priority).

## Prior Art
- Image format performance comparisons in Chromium often show WebP encoding is faster than PNG, especially for screenshots.