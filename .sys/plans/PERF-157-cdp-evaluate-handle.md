---
id: PERF-157
slug: cdp-evaluate-handle
status: unclaimed
claimed_by: ""
created: 2024-04-03
completed: ""
result: ""
---

# PERF-157: Evaluate Handle Capture API

## Focus Area
DOM Frame Capture Pipeline (`packages/renderer/src/strategies/DomStrategy.ts`). Testing if using `page.evaluateHandle()` to capture screenshots directly within the browser context and manage memory avoids the base64 IPC bottleneck associated with `HeadlessExperimental.beginFrame`.

## Background Research
The `Renderer.ts` hot loop's largest bottleneck is the massive Node.js IPC transfer required to shuttle base64 encoded PNG/JPEG strings from Chromium. In the "Open Questions" journal, it is asked whether using `page.evaluateHandle()` or another direct API could be faster. By using `evaluateHandle`, we can execute code within the page's execution context and retain references on the V8 heap in the browser instead of transferring the full payload back to Node via CDP synchronously.

However, the image data ultimately must be streamed to FFmpeg. If we use `evaluateHandle`, the data still needs to cross the boundary. The real test is whether keeping it in an optimized array buffer and transferring it over a different channel or parsing it out differently reduces overhead compared to standard CDP string encoding. If `evaluateHandle` can capture the frame and somehow avoid string encoding (e.g. streaming binary buffer blobs via a different mechanism or optimizing the boundary), it could improve performance.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.8s
- **Bottleneck analysis**: IPC latency of fetching screenshot data over CDP as massive base64 strings.

## Implementation Spec

### Step 1: Use `page.evaluateHandle` for frame extraction
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, instead of using `HeadlessExperimental.beginFrame` directly to get the payload, investigate if we can use `this.targetElementHandle.evaluateHandle(...)` to render the DOM target to a hidden HTMLCanvasElement (via html2canvas or native APIs if possible), extract the `ImageData` buffer directly, and transfer it back efficiently (perhaps relying on Playwright's optimized binary transfer for evaluate return types rather than base64 strings).
If `html2canvas` is too slow, explore if there's a way to trigger a native render without base64 encoding crossing the boundary, or if `evaluateHandle` provides access to raw pixel arrays faster.
**Why**: Base64 decoding in Node and transferring strings over IPC is slower than raw binary data transfer.
**Risk**: In-browser rendering (like `html2canvas`) or Canvas `drawWindow` equivalents might be slower than the native CDP base64 string building, negating any IPC transfer benefits.

## Correctness Check
Run benchmark tests to check if rendering completes successfully.
