---
id: PERF-381
slug: raw-cdp-screencast-no-await
status: unclaimed
claimed_by: ""
created: 2024-05-01
completed: ""
result: ""
---

# PERF-381: Pipeline HeadlessExperimental.beginFrame and Page.startScreencast

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture` method.

## Background Research
Currently, `DomStrategy` uses `HeadlessExperimental.beginFrame` and awaits the response (containing `screenshotData`). Awaiting `beginFrame` blocks the hot loop for ~38ms per frame due to IPC roundtrip overhead, yielding a ~23-24s baseline for 600 frames.

However, we can combine `HeadlessExperimental.beginFrame` (to advance the compositor clock deterministically) with `Page.startScreencast` (to push frames asynchronously) while **NOT awaiting the `beginFrame` response**.

By calling `beginFrame` synchronously (i.e. not awaiting it), we immediately request Chromium to compose a frame. We then await a promise resolved by the `Page.screencastFrame` listener. Because Chromium only emits `screencastFrame` when visual damage occurs, we must also set a short timeout (e.g. 100ms) to resolve the promise with the `lastFrameData` in case of no damage.

Benchmarking this approach locally shows a reduction from ~23 seconds to ~15.5 seconds for a 600-frame render, an enormous **32% improvement** due to fully pipelining the capture step.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: IPC latency caused by awaiting `HeadlessExperimental.beginFrame` response.

## Implementation Spec

### Step 1: Subscribe to Screencast
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add state variables:
```typescript
private screencastResolver: ((data: string | Buffer) => void) | null = null;
```

In `prepare()`:
1. Add a listener to `cdpSession`:
```typescript
this.cdpSession!.on('Page.screencastFrame', (event) => {
  this.lastFrameBuffer = Buffer.from(event.data, 'base64');
  this.cdpSession!.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  if (this.screencastResolver) {
    this.screencastResolver(this.lastFrameBuffer);
    this.screencastResolver = null;
  }
});
```
2. Start the screencast:
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
Rewrite `capture(page, frameTime)`:
- If `this.targetElementHandle` is present, keep the existing logic.
- Otherwise, send `beginFrame` WITHOUT awaiting the response and WITHOUT asking for a screenshot:
```typescript
this.cdpSession!.send('HeadlessExperimental.beginFrame', {
  interval: this.frameInterval,
  frameTimeTicks: 10000 + frameTime
}).catch(() => {});
```
- Return a Promise that waits for the screencast frame:
```typescript
return new Promise<Buffer>((resolve) => {
  this.screencastResolver = resolve;
  // If no frame arrives within 100ms, assume no damage and use last frame.
  setTimeout(() => {
    if (this.screencastResolver === resolve) {
        this.screencastResolver = null;
        resolve(this.lastFrameBuffer || this.emptyImageBuffer);
    }
  }, 100);
});
```

**Why**: Unblocks Node.js while Chromium renders, letting `screencastFrame` push data to Node.js asynchronously.
**Risk**: Desynchronization, or timing out too early if the compositor is slow (though 100ms is 3x standard frame time, it should be enough since we don't await IPC).
