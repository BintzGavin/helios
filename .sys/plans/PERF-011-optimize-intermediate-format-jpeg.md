---
id: PERF-011
slug: optimize-intermediate-format-jpeg
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-011: Optimize Intermediate Format to JPEG

## Context & Goal
The Frame Capture Loop (phase 4) in `packages/renderer/src/strategies/DomStrategy.ts` currently defaults to using `'png'` as the intermediate format when calling `Page.captureScreenshot` via CDP. In a CPU-bound microVM without a GPU, encoding a frame to PNG inside Chromium often takes a significant amount of time due to the complexity of the PNG compression algorithm. JPEG encoding is significantly faster than PNG encoding inside Skia, and the resulting I/O between Chromium, Node, and FFmpeg is smaller, eliminating IPC overhead. The goal is to intelligently default to `jpeg` (quality 90) when no alpha channel is required by the requested `pixelFormat`, falling back to `png` only when transparency is explicitly needed.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Step 1: Intelligently default to JPEG in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture()` method, modify the logic that determines the `format` and `quality` variables.
- First, determine if `hasAlpha` is true based on whether the `pixelFormat` includes alpha channels (`yuva`, `rgba`, `bgra`, `argb`, `abgr`), mirroring existing logic.
- If `this.options.intermediateImageFormat` is provided, use it.
- If it is not provided, check `hasAlpha`. If `hasAlpha` is false, default the format to `jpeg` and the quality to `this.options.intermediateImageQuality ?? 90`.
- If `hasAlpha` is true, fallback to the default `png` format.

**Why**: JPEG encoding is significantly faster than PNG encoding, and the payload sizes transferred over IPC are smaller.
**Risk**: Slight loss of quality due to JPEG compression, but at quality 90, it's virtually indistinguishable for video encoding that is already lossy (e.g. libx264).

## Test Plan
1. Run a standard Canvas smoke test by executing `npx tsx tests/verify-codecs.ts` inside the `packages/renderer` directory.
2. Ensure output video is identical in quality by comparing test outputs. Ensure no skipped frames.