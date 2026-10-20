---
id: PERF-1114
slug: cdp-start-screencast
status: complete
claimed_by: "executor-session"
created: 2024-10-19
completed: "2024-10-19"
result: "failed"
---

# PERF-1114: CDP startScreencast IPC Optimization

## Focus Area
DOM Capture Strategy (`packages/renderer/src/strategies/DomStrategy.ts`) and IPC logic.

## Background Research
Currently, the DOM renderer relies heavily on `Page.captureScreenshot` being sequentially invoked for every frame over the Chrome DevTools Protocol. This serial request-response approach incurs heavy IPC latency (Node -> Browser -> Node) which bottlenecks the overall rendering pipeline, dominating CPU time and blocking parallel browser compositor rendering.

The Chrome DevTools Protocol provides an alternative continuous streaming endpoint: `Page.startScreencast`. By adopting `Page.startScreencast` using a lossy format (e.g., JPEG with tuning parameters) instead of awaiting discrete PNG `captureScreenshot` commands, the browser pushes encoded frames continuously directly to the Node.js process without requiring a round-trip initiation. This drastically decreases IPC latency per frame and enables better Node.js CPU overlapping.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.68s
- **Bottleneck analysis**: IPC overhead blocking frame delivery.

## Implementation Spec

### Step 1: Implement `startScreencast` Event Listener
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. In `prepare()`, initiate the screencast using `await this.cdpSession!.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 })`.
2. Attach a listener to `this.cdpSession!.on('Page.screencastFrame', ...)` which caches incoming frames into an internal queue or `lastFrameData`.
3. Within the `Page.screencastFrame` callback, immediately acknowledge the frame receipt via `await this.cdpSession!.send('Page.screencastFrameAck', { sessionId: event.sessionId })` so the browser continues dispatching.
4. Update the `capture` method to simply return the head of the incoming screencast queue (or await the next frame if the queue is empty) rather than invoking `captureScreenshot`.
5. Update `finish` to trigger `Page.stopScreencast` and cleanup the event listeners.
**Why**: Shifting from a pull-based (request/response) model to a push-based model decreases execution overhead.
**Risk**: Frame synchronization dropping (the screencast may dispatch at an unpredictable internal browser rate, which could misalign with `setTime` composition ticks requiring buffering strategy alignment).

## Variations
None.

## Canvas Smoke Test
Run a render locally on a composition in `canvas` mode to ensure the refactored code correctly delegates without breaking the alternative renderer loop.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure canvas and dom modes output frames correctly and gracefully exit.

## Prior Art
"Would Page.startScreencast with JPEG compression beat raw CDP screenshots?" was mentioned in the `RENDERER-EXPERIMENTS.md` journal's open questions.

## Results Summary
- **Best render time**: 4.652s
- **Improvement**: 46.41%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-1114]
