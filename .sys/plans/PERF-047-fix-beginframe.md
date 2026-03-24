---
id: PERF-047
slug: fix-beginframe
status: complete
claimed_by: "executor-session"
created: 2024-05-28
completed: "2024-05-28"
result: "improved"
---
# PERF-047: Fix HeadlessExperimental.beginFrame error and Ensure Damage-Driven Capture

## Focus Area
DOM Rendering Frame Capture Overhead. The current implementation in `DomStrategy.ts` using `HeadlessExperimental.beginFrame` throws an error because it expects `screenshotData` on every frame. Chromium's `beginFrame` optimization, however, is damage-driven by default, meaning it will omit the screenshot data if it determines the visual state hasn't changed since the last frame.

## Background Research
The `PERF-045` experiment successfully proved that using `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` significantly reduces frame capture overhead (from ~33.5s to ~32.0s). However, in scenes where no visual changes occur between virtual time ticks (e.g., static scenes, delays, or early frames), Chromium skips the layout/paint and `HeadlessExperimental.beginFrame` returns without `screenshotData` (often returning `{ hasDamage: false }`).
When this happens, the renderer crashes with `Error: HeadlessExperimental.beginFrame did not return screenshotData`. Since we are producing a continuous video stream for FFmpeg, we must always provide a frame buffer, even if it's identical to the previous one. We can fix this by safely falling back to the most recently captured frame buffer when `screenshotData` is omitted.

## Benchmark Configuration
- **Composition URL**: `examples/simple-animation/output/example-build/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Fails to run (error `HeadlessExperimental.beginFrame did not return screenshotData`)
- **Bottleneck analysis**: The lack of a fallback mechanism in `DomStrategy.ts` when `beginFrame` detects no damage causes the pipeline to crash.

## Implementation Spec

### Step 1: Implement Damage Fallback in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `DomStrategy.ts` around line 145, update the `capture` method's `cdpSession` block:

```typescript
        const { screenshotData } = await this.cdpSession.send('HeadlessExperimental.beginFrame', {
          screenshot
        });

        if (screenshotData) {
          const buffer = Buffer.from(screenshotData, 'base64');
          this.lastFrameBuffer = buffer;
          return buffer;
        } else if (this.lastFrameBuffer) {
          // Chromium detected no visual damage and omitted the screenshot.
          // Reuse the last successfully captured frame for the video stream.
          return this.lastFrameBuffer;
        } else {
          // If no damage was detected but we don't have a previous frame (e.g., frame 0),
          // fallback to a standard CDP capture to guarantee an initial frame buffer.
          const res = await this.cdpSession.send('Page.captureScreenshot', { format, quality } as any);
          const buffer = Buffer.from(res.data, 'base64');
          this.lastFrameBuffer = buffer;
          return buffer;
        }
```

**Why**: This change gracefully handles Chromium's damage-driven optimization. If the browser determines a new paint is unnecessary, we avoid throwing an error and simply reuse the previous frame buffer, which is both correct for the video stream and saves the cost of decoding a redundant PNG/WebP frame.
**Risk**: If Chromium incorrectly reports "no damage" due to a bug in virtual time synchronization, the video might stutter. However, because we explicitly force animations via `setTime`, this is unlikely. The fallback to `Page.captureScreenshot` ensures we never fail to start.

## Canvas Smoke Test
Run the Canvas baseline script to ensure basic rendering still works.
`npx tsx scripts/render.ts`

## Correctness Check
Run the DOM render script and verify output exists, has valid video contents, and does not crash.
`npx tsx scripts/render-dom.ts`

## Prior Art
- PERF-045: Introduced `HeadlessExperimental.beginFrame` but failed to account for damage-driven omissions.
- PERF-033: Explored `Page.startScreencast`, which suffered from similar damage-driven starvation issues.

## Results Summary
- **Best render time**: 33.472s (vs baseline Fails)
- **Improvement**: N/A (Fixed Crash)
- **Kept experiments**: Handled damage-driven `screenshotData` omission in `HeadlessExperimental.beginFrame` by reusing previous frame buffer.
- **Discarded experiments**: None
