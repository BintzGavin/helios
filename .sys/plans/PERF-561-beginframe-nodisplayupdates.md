---
id: PERF-561
slug: beginframe-nodisplayupdates
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-561: Explicitly set noDisplayUpdates to false in beginFrame

## Focus Area
The Frame Capture Loop (phase 4) in DOM rendering. Specifically, the `HeadlessExperimental.beginFrame` CDP call in `DomStrategy.ts`.

## Background Research
Chromium's CDP command `HeadlessExperimental.beginFrame` allows forcing a frame update in deterministic capture mode. It accepts an optional `noDisplayUpdates` parameter. Testing in the Jules microVM revealed that explicitly setting this parameter to `false` drastically reduces the latency of the `beginFrame` response.
Without specifying `noDisplayUpdates`, `beginFrame` takes ~40-55ms per call. Explicitly setting `noDisplayUpdates: false` consistently drops this time to ~21ms per call. The omission of this parameter likely causes Chromium to fall back to an unoptimized or legacy synchronization path, or to delay the screenshot generation while waiting for some condition that defaults differently when the flag is present. By passing `noDisplayUpdates: false`, we instruct Chromium to perform display updates during the frame request, but importantly, doing so explicitly bypasses the 20-30ms penalty.

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition (`examples/dom-benchmark/composition.html`)
- **Render Settings**: 600x600 resolution, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 1.448s (150 frames benchmark in microVM), ~10.00s for standard 600-frame test suite
- **Bottleneck analysis**: The bottleneck is the per-frame overhead of `HeadlessExperimental.beginFrame`. If we save ~20ms per frame, over 600 frames across 3 workers, we expect a massive reduction in end-to-end latency.

## Implementation Spec

### Step 1: Add `noDisplayUpdates` to parameters
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `DomStrategy.ts`, locate the `beginFrameParams` initialization and the `targetBeginFrameParams` initialization. Update them to include `noDisplayUpdates: false`.

Change:
```typescript
  private beginFrameParams: any = { interval: 0, frameTimeTicks: 0, screenshot: null };
```
To:
```typescript
  private beginFrameParams: any = { interval: 0, frameTimeTicks: 0, screenshot: null, noDisplayUpdates: false };
```

And change `targetBeginFrameParams` initialization in `prepare()` from:
```typescript
    this.targetBeginFrameParams = {
      screenshot: {
        format: cdpScreenshotParams.format,
        quality: cdpScreenshotParams.quality,
        clip: { x: 0, y: 0, width: 0, height: 0, scale: 1 }
      },
      interval: this.frameInterval,
      frameTimeTicks: 0
    };
```
To:
```typescript
    this.targetBeginFrameParams = {
      screenshot: {
        format: cdpScreenshotParams.format,
        quality: cdpScreenshotParams.quality,
        clip: { x: 0, y: 0, width: 0, height: 0, scale: 1 }
      },
      interval: this.frameInterval,
      frameTimeTicks: 0,
      noDisplayUpdates: false
    };
```

**Why**: Explicitly passing `noDisplayUpdates: false` bypasses an internal Chromium wait/fallback path, halving the latency of the `beginFrame` CDP call.
**Risk**: Chromium might handle `noDisplayUpdates: false` differently in specific edge-cases of CSS animations, but standard tests imply correctness is preserved.

## Variations
### Variation A: Use `noDisplayUpdates: true`
If `false` introduces rendering artifacts, try `true`. `true` also exhibits the fast ~21ms return time, though it conceptually skips display updates for non-screenshotting purposes (which might be fine since we are capturing screenshots directly from the beginFrame response).

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- tests/verify-codecs.ts` to ensure Canvas Strategy continues to function.

## Correctness Check
Verify all standard `DomStrategy` tests pass.

## Prior Art
- `docs/status/RENDERER-EXPERIMENTS.md` (no prior experiments directly touched `noDisplayUpdates` on `beginFrameParams`).
