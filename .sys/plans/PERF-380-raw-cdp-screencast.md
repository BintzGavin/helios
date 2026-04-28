---
id: PERF-380
slug: raw-cdp-screencast
status: complete
claimed_by: "executor"
created: 2024-05-01
completed: "2026-04-28"
result: "discard"
---

# PERF-380: Replace HeadlessExperimental.beginFrame with Page.startScreencast

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture` method.

## Background Research
Currently, the DOM renderer uses `HeadlessExperimental.beginFrame` for its primary screenshot capability (unless a `targetSelector` is specified). `beginFrame` relies on a request-response RPC paradigm: we tell the Chromium compositor to advance the clock, render a frame, and return the image data. This request requires waiting for an IPC acknowledgment.

However, `Page.startScreencast` offers an asynchronous pipeline for continuous screenshotting. By invoking `startScreencast`, Chromium automatically streams `Page.screencastFrame` events as fast as the compositor produces them. Node.js can act strictly as a push subscriber, grabbing the incoming Base64 image data and acknowledging (`Page.screencastFrameAck`) immediately to unblock the browser.

This pull-to-push inversion eliminates Node.js's waiting on IPC for each frame. Instead of Node.js halting the hot loop while waiting for `beginFrame` to return, it can simply resolve the current `capture` call using the latest `screencastFrame` data pushed by Chromium. The `SeekTimeDriver` already advances virtual time and induces render ticks.

## Benchmark Configuration
- **Composition URL**: Any standard DOM test (e.g., tests/verify-dom-strategy-capture.ts)
- **Render Settings**: 1920x1080, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: IPC latency caused by the sequential request-response pattern of `HeadlessExperimental.beginFrame`.

## Implementation Spec

### Step 1: Subscribe to Screencast Events
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` method, add a listener for `Page.screencastFrame` on the `cdpSession`.
When a frame arrives:
1. Update `this.lastFrameData` with the `data` (base64 string).
2. Call `this.cdpSession.send('Page.screencastFrameAck', { sessionId: event.sessionId })` to immediately acknowledge and unblock Chromium.
3. If there is a pending `screencastPromiseResolver`, invoke it with `event.data` and clear it.

Then, start the screencast:
```typescript
await this.cdpSession!.send('Page.startScreencast', {
  format: this.cdpScreenshotParams.format,
  quality: this.cdpScreenshotParams.quality,
  everyNthFrame: 1
});
```

### Step 2: Refactor Capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite `capture(page, frameTime)` to wait for the next `screencastFrame` event.
- If `this.targetElementHandle` is present, maintain the existing fallback (`targetElementHandle.screenshot()`).
- Otherwise, create a new Promise mapped to `this.screencastPromiseResolver`. The screencast listener from Step 1 will resolve this promise with the newly captured Base64 string once Chromium emits it.
- Remove `HeadlessExperimental.beginFrame`.

**Why**: Removes IPC request latency from Node.js's capture loop. Chromium handles screenshotting natively and pushes frames down.
**Risk**: Desynchronization between `SeekTimeDriver.setTime` (which updates DOM time) and the compositor emitting frames. If the compositor doesn't think an update is needed, it might not emit a `screencastFrame`, deadlocking `capture`.

## Variations
Variation A: Add a `setTimeout` inside `capture`. If no screencast frame arrives within 100ms, assume the DOM didn't visually change and resolve with `this.lastFrameData`.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` (if exists) or confirm Canvas mode `npm test` still passes.

## Correctness Check
Run `npm run benchmark:dom` (if available) or `node` script to verify frame sequence.

## Results Summary
- **Best render time**: 0.000s (vs baseline ~46.546s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Step 1: Replace HeadlessExperimental.beginFrame with Page.startScreencast]
