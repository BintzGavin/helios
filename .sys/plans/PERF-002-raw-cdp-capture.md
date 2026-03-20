---
id: PERF-002
slug: raw-cdp-capture
status: unclaimed
claimed_by: ""
created: 2026-03-19
completed: ""
result: ""
---

# PERF-002: Bypass Playwright Overhead with Raw CDP Capture

## Focus Area
The Frame Capture Loop (phase 4) in `packages/renderer/src/strategies/DomStrategy.ts`. We are targeting the `capture()` method to eliminate the overhead added by Playwright's high-level `page.screenshot()` API.

## Background Research
Playwright's `page.screenshot()` includes multiple internal layers of safety checks: it verifies elements are actionable, performs layout thrashing, and adds significant IPC overhead. Since our time drivers (`SeekTimeDriver` and `CdpTimeDriver`) already explicitly manage virtual time and wait for the page to be stable before returning, Playwright's internal checks are completely redundant. They add measurable overhead to every single frame. Using the raw Chrome DevTools Protocol (CDP) `Page.captureScreenshot` directly via `page.context().newCDPSession(page)` skips these checks entirely, providing a more direct and faster path to the frame buffer.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition (e.g., `http://localhost:3000/default-dom-test`)
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: TBD (dependent on machine, see PERF-001 results for baseline context)
- **Bottleneck analysis**: The `capture` method currently calls `await page.screenshot(...)`. Profiling typical Playwright usage shows that `screenshot` does extensive pre-checks. When capturing 30-60 frames per second, avoiding 5-10ms of overhead per frame can yield a noticeable total render time reduction.

## Implementation Spec

### Step 1: Initialize CDP Session in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add a private property `cdpSession: CDPSession | null = null;` to the `DomStrategy` class.
2. In the `prepare(page: Page)` method, initialize it using `this.cdpSession = await page.context().newCDPSession(page);`.
**Why**: We need an active CDP session to send raw commands. Reusing a session per render avoids the overhead of creating one for every frame.
**Risk**: Low. CDP sessions are standard in Playwright and widely used in our drivers.

### Step 2: Handle Transparent Backgrounds (omitBackground)
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare(page: Page)` method, determine if alpha is needed (using the same logic currently in `capture()`):
```typescript
const pixelFormat = this.options.pixelFormat || 'yuv420p';
const hasAlpha = pixelFormat.includes('yuva') || pixelFormat.includes('rgba') || pixelFormat.includes('bgra') || pixelFormat.includes('argb') || pixelFormat.includes('abgr');
```
If `hasAlpha` is true, send the CDP command to override the background color:
```typescript
await this.cdpSession.send('Emulation.setDefaultBackgroundColorOverride', {
  color: { r: 0, g: 0, b: 0, a: 0 }
});
```
**Why**: Playwright's `omitBackground` does exactly this under the hood. Since we are bypassing Playwright, we must replicate this behavior manually to preserve transparency support.
**Risk**: Moderate, but perfectly aligns with DevTools protocol documentation.

### Step 3: Replace page.screenshot with CDP Page.captureScreenshot
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture(page: Page, frameTime: number)` method:
1. If `this.options.targetSelector` is set, keep the existing Playwright `element.screenshot(...)` fallback logic (since bounding box clipping via CDP is more complex and less commonly a bottleneck).
2. Otherwise, replace `page.screenshot(...)` with a raw CDP call:
```typescript
const format = this.options.intermediateImageFormat || 'png';
const captureParams: any = { format };

if (format === 'jpeg' && this.options.intermediateImageQuality !== undefined) {
  captureParams.quality = this.options.intermediateImageQuality;
}

const { data } = await this.cdpSession!.send('Page.captureScreenshot', captureParams);
return Buffer.from(data, 'base64');
```
**Why**: This directly asks Chrome for the framebuffer, avoiding Playwright's actionability and stability loops.
**Risk**: Low. Buffer decoding from base64 is already what Playwright does internally.

## Variations

### Variation A: Page.startScreencast
If `Page.captureScreenshot` is still slow due to request-response round trips, an alternative is to use `Page.startScreencast`. This tells Chrome to actively push frames to Node.js. The executor would need to set up a listener for `Page.screencastFrame`, advance the `TimeDriver`, wait for the corresponding frame event, acknowledge it via `Page.screencastFrameAck`, and pipe the buffer.

## Canvas Smoke Test
Run a standard Canvas smoke test. The changes in `DomStrategy` should not affect `CanvasStrategy`, but verify `Renderer.ts` initialization still functions properly without regressions.

## Correctness Check
1. Ensure transparent backgrounds still work correctly when using a pixel format with alpha (e.g., `yuva420p`).
2. Verify no frames are dropped and the output video length is correct.
3. Confirm that capturing with a `targetSelector` still functions via the Playwright fallback.

## Prior Art
- Playwright page.screenshot overhead: Standard knowledge in performance-sensitive scraping contexts is to drop down to raw CDP for screenshots.
- CDP Documentation for `Page.captureScreenshot`: https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot
