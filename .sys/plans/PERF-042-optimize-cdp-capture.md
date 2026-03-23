---
id: PERF-042
slug: optimize-cdp-capture
status: unclaimed
claimed_by: ""
created: 2024-05-15
completed: ""
result: ""
---
# PERF-042: Optimize CDP Capture using captureBeyondViewport: false

## Focus Area
Frame Capture Loop & Chromium CDP `Page.captureScreenshot` efficiency.

## Background Research
The dominant bottleneck in the DOM render mode is Chromium's `Page.captureScreenshot` execution. A previous experiment (PERF-034) attempted to use `optimizeForSpeed: true` and `fromSurface: true`, along with an explicit `clip` bounding box, but yielded no improvement in this CPU-only microVM. However, Chromium's CDP documentation indicates that by default `captureBeyondViewport` is set to true. This instructs Chromium to capture a screenshot of the entire document (up to certain limits), which can force layout and paint passes for off-screen elements or elements larger than the designated viewport size. By explicitly setting `captureBeyondViewport: false` in our `CDPSession` send payload, we may reduce the CPU cost of rasterizing and compositing elements outside the immediate video dimensions (e.g., if a composition has an oversized background or hidden overflowing elements).

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 600x600, 30fps, 150 frames (5 seconds), JPEG intermediate format
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.324s
- **Bottleneck analysis**: Unnecessary CPU overhead from rasterizing and compositing elements outside the active viewport.

## Implementation Spec

### Step 1: Disable captureBeyondViewport in CDP capture options
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, locate the parameters for both the direct `CDPSession` call and the fallback `page.screenshot` call. Modify both to include the configuration flag indicating that the browser should strictly only capture pixels within the active viewport bounds.

**Why**: Setting this flag instructs the browser engine to only rasterize and capture pixels strictly within the active viewport bounds. If the composition has any layout anomalies or off-screen elements that trigger larger paint rects, this flag eliminates the overhead of calculating and copying those pixels.
**Risk**: If a composition relies on capturing an oversized scrolling element by explicitly selecting it (using a target selector), this might crop the image. However, Helios compositions are typically fixed-resolution bounded canvases designed for video output, so the viewport bounds should match the video bounds perfectly.

## Canvas Smoke Test
Run the Canvas baseline script to ensure basic rendering still works.
`npx tsx packages/renderer/scripts/render.ts`

## Correctness Check
Run the DOM render script and verify output exists and has valid video contents.
`npx tsx packages/renderer/scripts/render-dom.ts`

## Prior Art
- PERF-034: `optimizeForSpeed` and `fromSurface` testing (failed).
- CDP `Page.captureScreenshot` documentation.
