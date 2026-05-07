---
id: PERF-443
slug: webp-quality-50
status: complete
claimed_by: "executor-session"
created: 2025-05-24
completed: "2025-05-24"
result: "failed"
---

# PERF-443: Use WebP with Low Quality for All Intermediate Formats

## Focus Area
DOM Rendering phase 4: Strategy Preparation (`DomStrategy.ts`).

## Background Research
Currently, `DomStrategy` defaults to `png` for non-alpha formats and only uses `webp` if an alpha channel is detected or if specifically requested. From prior experiments, we've found that `png` encoding inside headless Chrome is heavily CPU-bound and produces large payloads that slow down IPC transfer and Node GC. WebP at quality 50 is known to be significantly faster to encode than PNG in Chromium, and the smaller payload sizes relieve V8's GC and Node's IPC bottlenecks. We will change the default intermediate format to `webp` at quality `50` for ALL renders (both alpha and non-alpha).

## Benchmark Configuration
- **Composition URL**: `dom-benchmark`
- **Render Settings**: 1280x720, 30fps, 3s duration (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~42.2s (with all current optimizations)
- **Bottleneck analysis**: PNG encoding in Chromium and large IPC payload transfers between Chromium and Node.js.

## Implementation Spec

### Step 1: Update Default Format in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, change the default `format` assignment to always use `webp` with a default `quality` of `50`.

```typescript
    // Cache parameters
    let format = this.options.intermediateImageFormat;
    let quality = this.options.intermediateImageQuality;

    if (!format) {
      format = 'webp';
      quality = quality ?? 50;
    }
```
**Why**: WebP encoding at quality 50 in Chromium is faster and produces significantly smaller IPC payloads than PNG, reducing V8 overhead and IPC latency.
**Risk**: Minor compression artifacts due to q=50, but it is an acceptable tradeoff for the raw performance benchmark, and users can override it if they need lossless quality.

## Correctness Check
Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js` to ensure the strategy correctly pipes WebP frames to FFmpeg without crashing.

## Results Summary
- **Best render time**: 32.622s (vs baseline 43.633s)
- **Improvement**: ~25%
- **Kept experiments**: None
- **Discarded experiments**: Use WebP at quality 50 as default format for all intermediate captures.