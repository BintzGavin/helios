---
id: PERF-026
slug: parallel-screencast
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-026: Parallel Screencast Capture

## Focus Area
The Frame Capture Loop (phase 4) in `packages/renderer/src/Renderer.ts`.

## Background Research
Currently, we use a pool of Chromium pages to parallelize frame capture. Each page sequentially executes `timeDriver.setTime()` and `strategy.capture()`. `DomStrategy` relies on CDP `Page.captureScreenshot`, which takes significant time to generate individual JPEGs via a request-response model.

In an isolated benchmark, switching from sequential `Page.captureScreenshot` to a continuous push-based `Page.startScreencast` reduced the per-frame overhead significantly (from ~33ms per frame to ~17ms per frame). By upgrading the current `DomStrategy` capture logic to use a push-based screencast queue in tandem with the existing parallel pool (multiple pages streaming frames via screencast simultaneously), we can drastically increase frame throughput in `mode: 'dom'`.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: 150 frames, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.013s
- **Bottleneck analysis**: The Playwright request/response cycle for `captureScreenshot` introduces IPC latency that blocks the CPU from doing useful work.

## Implementation Spec

### Step 1: Initialize Screencast in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add state variables: `frameQueue: Buffer[] = []`, `frameResolver: ((buffer: Buffer) => void) | null = null`.
In the `prepare` method, after initializing `this.cdpSession`, set up the screencast event listener:
Listen for `Page.screencastFrame`. The event contains base64 image data and a `sessionId`. Send `Page.screencastFrameAck` to acknowledge receipt. Convert the base64 data to a Buffer. If `frameResolver` is set, invoke it and clear it. Otherwise, push the Buffer to `frameQueue`.
Then, start the screencast: `await this.cdpSession.send('Page.startScreencast', { format, quality });`. Note: ensure we determine `format` and `quality` here during prepare (webp or jpeg based on alpha requirement).

### Step 2: Consume Screencast Frames in capture()
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, check if `frameQueue` has items. If so, `shift()` one and return it immediately.
If `frameQueue` is empty, return a Promise that assigns its resolve function to `frameResolver`.
If `this.options.targetSelector` is set, either apply a crop using Playwright's API or gracefully fallback to the existing `captureScreenshot` / `screenshot` behavior for that element.

### Step 3: Cleanup Screencast
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `finish` method, stop the screencast using `await this.cdpSession.send('Page.stopScreencast')` before detaching.

## Variations
If synchronizing the pushed screencast frames with virtual time becomes flaky (e.g. receiving a frame that was rendered before virtual time advanced), implement a loop to wait for the DOM to settle or discard stale frames based on metadata.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/render.ts`. Expect to see FFmpeg error out (as no GPU is present), but capture logic should remain functional.

## Correctness Check
Verify `dom-animation.mp4` renders correctly with synchronized animations.
