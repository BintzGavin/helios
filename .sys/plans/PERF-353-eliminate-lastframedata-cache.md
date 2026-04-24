---
id: PERF-353
slug: eliminate-lastframedata-cache
status: unclaimed
claimed_by: ""
created: 2024-04-24
completed: ""
result: ""
---

# PERF-353: Eliminate Base64 Caching (lastFrameData) in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture()` method

## Background Research
In `DomStrategy.ts`, the `capture()` method caches the base64 string result of the last captured frame (`this.lastFrameData`). If Playwright's `HeadlessExperimental.beginFrame` somehow doesn't return `screenshotData` (e.g., due to CDP pipelining skips or no-op returns), the method falls back to returning the cached string of the previous frame.

However, in the context of the CPU-bound Jules microVM, keeping a ~3-5MB base64 string cached in `this.lastFrameData` across every frame forces V8 to retain that large string in the old-space garbage collection heap. When a new frame arrives, the old string is dereferenced and replaced, creating massive GC churn and increasing the memory footprint (which affects the CPU due to GC sweeps).

Furthermore, `HeadlessExperimental.beginFrame` almost always returns `screenshotData` when properly requested. Even if it doesn't, passing a small 1x1 empty pixel string (which we already create as `this.emptyImageBase64`) instead of a massive 4MB previous frame is completely fine for a single dropped frame, and drastically reduces memory pressure.

By eliminating `this.lastFrameData` and returning `this.emptyImageBase64` as a fallback, we can reduce V8 memory footprint and GC sweep overhead during the tight frame-capture loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.2s
- **Bottleneck analysis**: Large base64 strings constantly moving in and out of the V8 old-space heap causing GC churn and memory overhead.

## Implementation Spec

### Step 1: Remove `lastFrameData` state
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove `private lastFrameData: Buffer | string | null = null;` from class properties.
2. In `prepare()`, remove `this.lastFrameData = this.emptyImageBase64;`.
3. In `capture()`, stop updating `this.lastFrameData`. If a response lacks data, return `this.emptyImageBase64` directly.

For example:
```typescript
<<<<<<< SEARCH
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    }
    return this.lastFrameData!;
=======
    if (res && res.screenshotData) {
      return res.screenshotData;
    }
    return this.emptyImageBase64;
>>>>>>> REPLACE
```
Apply this to both the standard `beginFrame` path and the targeted `beginFrame` / `page.screenshot` paths.

**Why**: Avoids holding a 4MB string reference in a long-lived class property, allowing the V8 garbage collector to immediately clean up the previous frame's string after it's piped to FFmpeg (which happens in `CaptureLoop`).

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode architecture is unaffected.

## Correctness Check
Run the DOM mode verification script: `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure rendering behavior is maintained and dropped frames just use a 1x1 transparent/black pixel instead of the previous frame.

## Prior Art
- Memory reduction experiments (GC churn) have consistently yielded wins in Node.js pipelines (e.g. `PERF-348` inline allocations).
