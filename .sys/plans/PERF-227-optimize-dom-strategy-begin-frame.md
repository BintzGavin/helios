---
id: PERF-227
slug: optimize-dom-strategy-begin-frame
status: unclaimed
claimed_by: ""
created: 2024-06-06
completed: ""
result: ""
---

# PERF-227: Optimize HeadlessExperimental.beginFrame parameter object

## Focus Area
DOM Rendering Pipeline - CDP Message Dispatch in `DomStrategy.ts`.

## Background Research
In `packages/renderer/src/strategies/DomStrategy.ts`, the `capture` loop relies heavily on the `HeadlessExperimental.beginFrame` CDP message to capture a frame. For standard captures without a target element, the `this.beginFrameParams` object is reused, mutating only `frameTimeTicks`.

However, when a `targetSelector` is provided (`this.targetElementHandle`), the `capture` method fetches the bounding box via Playwright (`await this.targetElementHandle.boundingBox()`) on every single frame, and then creates a completely new anonymous object for the `HeadlessExperimental.beginFrame` parameters:
```typescript
        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
          screenshot: {
            format: this.cdpScreenshotParams.format,
            quality: this.cdpScreenshotParams.quality,
            clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
          },
          interval: this.frameInterval,
          frameTimeTicks: 10000 + frameTime
        } as any);
```

This creates multiple levels of object allocation (`clip`, `screenshot`, and the top-level parameters) on every frame. We can optimize this by pre-allocating a `targetBeginFrameParams` property during `prepare` (similar to `beginFrameParams`), and simply mutating its `clip.x`, `clip.y`, `clip.width`, `clip.height`, and `frameTimeTicks` values inside the hot loop.
While targeted captures might be less common, optimizing it is straightforward and eliminates V8 GC overhead for that code path.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom` (with a targetSelector to test the targeted path)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s (baseline for non-targeted, targeted will be slower due to `boundingBox()` overhead).
- **Bottleneck analysis**: Object allocation overhead during targeted element capture.

## Implementation Spec

### Step 1: Pre-allocate `targetBeginFrameParams`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add a class property `private targetBeginFrameParams: any = null;`.
2. In the `prepare` method, initialize it similarly to `beginFrameParams`:
```typescript
    this.targetBeginFrameParams = {
      screenshot: {
        format: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        clip: { x: 0, y: 0, width: 0, height: 0, scale: 1 }
      },
      interval: this.frameInterval,
      frameTimeTicks: 0
    };
```
3. Update the `capture` method to use it:
```typescript
<<<<<<< SEARCH
        // PERF-193: Reusing object is possible here too, but object creation with box clip is more complex and less common.
        // We optimize the main path first.
        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
          screenshot: {
            format: this.cdpScreenshotParams.format,
            quality: this.cdpScreenshotParams.quality,
            clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
          },
          interval: this.frameInterval,
          frameTimeTicks: 10000 + frameTime
        } as any);
=======
        this.targetBeginFrameParams.screenshot.clip.x = box.x;
        this.targetBeginFrameParams.screenshot.clip.y = box.y;
        this.targetBeginFrameParams.screenshot.clip.width = box.width;
        this.targetBeginFrameParams.screenshot.clip.height = box.height;
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
>>>>>>> REPLACE
```

**Why**: Reuses the parameter object for targeted capture instead of recreating the nested tree on every frame.
**Risk**: Minimal. `clip` properties are safely updated before each send.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the Canvas path remains fully functional, as it shares `CaptureLoop`.

## Correctness Check
Run `npx tsx packages/renderer/tests/run-all.ts` to ensure FFmpeg piping correctly handles backpressure without stalling.

## Prior Art
PERF-193 (which introduced `beginFrameParams` optimization for the non-targeted path).
