---
id: PERF-381
slug: pipeline-screencast
status: complete
claimed_by: ""
created: 2024-05-01
completed: ""
result: ""
---

# PERF-381: Pipeline HeadlessExperimental.beginFrame with Page.startScreencast

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts`

## Background Research
Earlier experiments (PERF-379, PERF-380) attempted to replace `HeadlessExperimental.beginFrame` entirely with `Page.startScreencast`. They failed and deadlocked because Chromium disables or suppresses automatic screencast frame emission when the browser is launched with `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw`. In this mode, Chromium expects explicit compositor ticks.

However, we can *combine* the two approaches. By using `Page.startScreencast` as a fast, asynchronous push mechanism for the pixel data, while simultaneously using `HeadlessExperimental.beginFrame` strictly to *tick* the virtual clock (without awaiting its response or capturing its screenshot data), we can eliminate the IPC request-response wait latency.

Node.js will issue `beginFrame` to tell Chromium "render the next frame", and then Node.js will wait for the `Page.screencastFrame` event to receive the resulting base64 string.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: IPC latency caused by awaiting `HeadlessExperimental.beginFrame` in `DomStrategy.capture()`.

## Implementation Spec

### Step 1: Subscribe to Screencast Events
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` method, add a listener for `Page.screencastFrame` on the `cdpSession`.
1.  Store a class property `this.screencastPromiseResolver`.
2.  When a frame arrives, if `this.screencastPromiseResolver` exists, call it with the `event.data` (the base64 string).
3.  Immediately call `this.cdpSession.send('Page.screencastFrameAck', { sessionId: event.sessionId })` to unblock Chromium.

Start the screencast:
```typescript
await this.cdpSession!.send('Page.startScreencast', {
  format: this.cdpScreenshotParams.format,
  quality: this.cdpScreenshotParams.quality,
  everyNthFrame: 1
});
```

### Step 2: Refactor Capture to Pipeline Events
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite `capture(page, frameTime)`:
-   If `this.targetElementHandle` is present, maintain the existing fallback.
-   Otherwise, do the following:
    1.  Create a Promise mapped to `this.screencastPromiseResolver`.
    2.  Send the `HeadlessExperimental.beginFrame` command **without awaiting it** and with `screenshot: undefined` or `screenshot: { format: 'png' }` if required to force a render (try without asking for screenshot data to avoid double encoding overhead). This ticks the compositor.
    3.  Await the Promise from step 1. The screencast listener will resolve this Promise once Chromium pushes the frame.

**Why**: Unblocks the Node.js event loop from waiting on the `beginFrame` IPC response. Node acts purely as a consumer, and the compositor pushes frames asynchronously.
**Risk**: Desynchronization or deadlocks if `beginFrame` doesn't trigger a `screencastFrame` event (e.g., if there are no visual changes).

## Verification Protocol
Run `npm run build` and `npm test` to ensure `Page.screencastFrame` emits deterministically for every `beginFrame` tick.

## Results Summary
- **Best render time**: 0.000s (vs baseline ~36.336s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-381 Pipeline screencast]
