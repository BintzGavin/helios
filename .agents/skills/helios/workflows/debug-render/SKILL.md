---
name: workflow-debug-render
description: Steps to diagnose and fix rendering issues in Helios compositions.
---

# Workflow: Debug Render

This workflow helps you identify and fix issues when your composition renders incorrectly (e.g., black frames, missing assets, timing glitches) or fails completely.

## 1. Run Diagnostics
The `Renderer` class has a built-in `diagnose()` method that checks the environment.

```typescript
import { Renderer } from '@helios-project/renderer';

const renderer = new Renderer({ ...options });
const report = await renderer.diagnose();

console.log(JSON.stringify(report, null, 2));
```
**Check for:**
- `browser.webCodecs`: Must be `true` for Canvas Mode.
- `ffmpeg.encoders`: Ensure `libx264` (or your chosen codec) is present.

## 2. Enable Playwright Traces
If the render crashes or produces unexpected visual results, enable tracing to see exactly what the browser did.

```typescript
await renderer.render(url, output, {
  tracePath: './render-trace.zip' // Saves a trace file
});
```
**Analyze the Trace:**
1. Go to [trace.playwright.dev](https://trace.playwright.dev/).
2. Upload `render-trace.zip`.
3. Scrub through the timeline to see screenshots, console logs, and network requests for every frame.

## 3. Check for "Stability" Issues
The renderer waits for the page to be "stable" before capturing a frame.
- **Network Idle:** By default, it waits for network requests to settle.
- **Helios Stability:** It waits for `helios.waitUntilStable()` which checks registered stability promises.

**Fix:**
If assets (fonts, images) are popping in:
```typescript
// In your composition code
helios.registerStabilityCheck(document.fonts.ready);
helios.registerStabilityCheck(myImageLoaderPromise);
```

## 4. Headless vs. Headed Debugging
Run the renderer in "headed" mode to watch the browser automation in real-time.

```typescript
const renderer = new Renderer({
  // ...
  browserConfig: {
    headless: false // Browser window will pop up
  }
});
```

## 5. Common Errors

### `TargetClosedError`
- **Cause:** The browser crashed, often due to running out of memory (OOM).
- **Fix:** Reduce concurrency (if distributed), or increase system memory.

### `TimeoutError`
- **Cause:** A frame took too long to render or an asset failed to load.
- **Fix:** Check network tabs in the trace. Ensure all local assets are accessible.

### Black/Empty Video
- **Cause:** Canvas not painting, or WebGL context lost.
- **Fix:** Use `mode: 'canvas'` for WebGL. Ensure `helios.bindToDocumentTimeline()` is called if using WAAPI.
