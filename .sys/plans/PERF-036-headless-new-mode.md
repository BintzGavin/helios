---
id: PERF-036
slug: headless-new-mode
status: unclaimed
claimed_by: ""
created: 2024-03-23
completed: ""
result: ""
---
# PERF-036: Enable Native Headless Mode (headless: "new")

## Focus Area
Browser Launch & Compositing Pipeline

## Background Research
Playwright historically used an older headless mode for Chromium (`--headless`). Chromium recently introduced a completely new headless implementation (`--headless=new` or passing `headless: true` with `--headless=new` in args) which is built directly on the native Chrome browser architecture rather than a separate headless shell.

This new native headless mode has different performance characteristics. Because it uses the full Chrome rendering pipeline, it may handle DOM layouts, paint operations, and the internal `Page.captureScreenshot` CDP command more efficiently or with different locking semantics than the legacy headless mode. Given that our rendering is heavily CPU-bound on layout and paint within the microVM, switching the underlying browser engine architecture is a high-leverage architectural change.

## Benchmark Configuration
- **Composition URL**: `file://${process.cwd()}/examples/simple-animation/examples/simple-animation/dist/composition.html`
- **Render Settings**: 1920x1080, 30fps, 300 frames (10 seconds), JPEG intermediate format
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Baseline is approx 33.823s based on previous successful experiments like PERF-035.
- **Bottleneck analysis**: The dominant cost is the per-frame `Page.captureScreenshot` call via CDP, which blocks on the browser's internal layout/paint and PNG/JPEG encoding pipeline.

## Implementation Spec

### Step 1: Update Browser Launch Args
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Modify `DEFAULT_BROWSER_ARGS` to use the new headless mode. Note that Playwright's `headless` option strictly accepts a boolean, so we must explicitly add `'--headless=new'` to the `args` array while keeping `headless: true`.

```typescript
// Replace:
const DEFAULT_BROWSER_ARGS = [
  '--disable-web-security',
  '--allow-file-access-from-files',
];

// With:
const DEFAULT_BROWSER_ARGS = [
  '--disable-web-security',
  '--allow-file-access-from-files',
  '--headless=new',
];
```

**Why**: This forces Chromium to use the native browser architecture for headless rendering instead of the legacy headless shell. This fundamentally changes how the compositor and render thread operate.
**Risk**: The new headless mode might have higher memory overhead or behave differently with our disabled GPU flags, potentially causing crashes or slowdowns if it relies more heavily on hardware acceleration that isn't present in the microVM.

## Canvas Smoke Test
Run a simple canvas render to ensure the canvas rendering mode still correctly instantiates the browser and captures frames.

## Correctness Check
Run the DOM benchmark and verify that the output `out.mp4` contains visually correct frames of the simple animation and is not blank or distorted.

## Prior Art
- Chromium Blog: "Chrome's new headless mode"
- Playwright release notes on `--headless=new`
