---
id: PERF-564
slug: webcodecs-dom-strategy
status: unclaimed
claimed_by: ""
created: 2024-05-21
completed: ""
result: ""
---

# PERF-564: Evaluate WebCodecs Fallback for DomStrategy

## Focus Area
The `DomStrategy` in `packages/renderer/src/strategies/DomStrategy.ts` uses CDP's `HeadlessExperimental.beginFrame` to capture frames as base64-encoded screenshots. This requires encoding every frame to an image (like JPEG/PNG/WEBP), shipping it via Playwright IPC to the Node.js process, and then decoding it to pipe to FFmpeg. We will explore if bringing the `CanvasStrategy`'s WebCodecs API approach to `DomStrategy` will be faster. Specifically, we will attempt to capture the DOM into a `<canvas>` element continuously, and then pass that to the `VideoEncoder` inside the browser, extracting raw chunks that bypass base64 encoding and Playwright IPC entirely.

## Background Research
Currently, `CanvasStrategy` uses WebCodecs (`VideoEncoder`) to encode frames directly in the browser and sends chunks to Node.js, which are then piped into FFmpeg via IVF or H264 formats. `DomStrategy` has to rely on Playwright's `page.screenshot` or `HeadlessExperimental.beginFrame` because standard DOM rendering isn't natively captured.
By rasterizing the DOM to a hidden `<canvas>` using a DOM-to-SVG-to-Canvas approach, and then piping that canvas into the existing `VideoEncoder` WebCodecs logic, we could bypass the massive base64 + IPC overhead of Chromium's built-in screenshot mechanism.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/`
- **Render Settings**: 150 frames, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.622s (with `noDisplayUpdates: true`)

## Implementation Spec

### Step 1: Implement WebCodecs Fallback in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Implement logic to render the DOM to a hidden canvas, instantiate a `VideoEncoder`, and extract raw chunks similar to `CanvasStrategy.ts`.
**Why**: This bypasses base64 encoding and Playwright IPC entirely.

## Canvas Smoke Test
Run `npx tsx packages/cli/src/index.ts build examples/simple-canvas-animation/ --out-dir /tmp/helios-build-canvas` and then `npx tsx packages/cli/src/index.ts render /tmp/helios-build-canvas/composition.html --mode canvas` to ensure Canvas mode still works perfectly.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken.
