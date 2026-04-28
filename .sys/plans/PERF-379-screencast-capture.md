---
id: PERF-379
slug: screencast-capture
status: unclaimed
claimed_by: ""
created: 2024-05-01
completed: ""
result: ""
---

# PERF-379: Replace HeadlessExperimental.beginFrame with Page.startScreencast

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture` hot loop.

## Background Research
Currently, the renderer relies on `HeadlessExperimental.beginFrame` to capture screenshots of the DOM frame by frame for the primary target. This requires Node.js to send a CDP request and await a response for every single frame, incurring IPC (Inter-Process Communication) roundtrip latency. The `beginFrame` approach is deterministic but highly sequential and sensitive to IPC overhead. (Note: PERF-366 removed beginFrame only for specific target elements using `targetElementHandle.screenshot()`, but the primary page capture still uses it).

The Chromium DevTools Protocol (CDP) provides `Page.startScreencast`, which instructs the browser to automatically emit `Page.screencastFrame` events whenever the compositor renders a new frame. This approach pushes frames asynchronously to Node.js without requiring a request-response cycle for each frame, effectively pipelining the capture process and entirely bypassing IPC request latency.

By subscribing to the `screencastFrame` event, Node.js can act purely as a consumer, writing the incoming base64 strings directly to FFmpeg as soon as they arrive. `Page.screencastFrameAck` can be sent immediately to unblock the browser.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 36.336s
- **Bottleneck analysis**: IPC latency caused by the sequential request-response pattern of `HeadlessExperimental.beginFrame` in `DomStrategy.capture()`.

## Implementation Spec

### Step 1: Implement Screencast Listener
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, set up a listener for `Page.screencastFrame`. The listener should extract the base64 `data` from the event, update `this.lastFrameData`, and immediately send `Page.screencastFrameAck` with the `sessionId` to unblock the compositor.

Start the screencast using `Page.startScreencast`:
```typescript
    await this.cdpSession!.send('Page.startScreencast', {
      format: 'png',
      everyNthFrame: 1
    });
```

### Step 2: Refactor Capture Method
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify the `capture()` method to rely on the latest frame received from the screencast stream instead of calling `beginFrame` for the primary page capture (the fallback `beginFrame` block).
Since virtual time advancement (`SeekTimeDriver.setTime`) triggers a render natively, `capture()` can simply return `this.lastFrameData`. To ensure synchronization, it might need to wait for a new `screencastFrame` event to fire if the frame hasn't updated yet, which can be implemented with a simple Promise resolver attached to the event listener.

**Why**: Reverses the control flow from pull (`beginFrame`) to push (`screencastFrame`), eliminating the IPC request latency from Node.js and allowing Chromium to stream frames as fast as virtual time advances.
**Risk**: Desynchronization between virtual time and received screencast frames, potentially causing duplicate or missed frames. Requires careful synchronization via a Promise queue or resolving the current `capture()` call upon receiving the next `screencastFrame`.

## Variations
If `startScreencast` proves too difficult to synchronize with exact virtual time boundaries, fall back to `beginFrame` and discard the experiment.

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated video contains exactly the correct, sequential frames without drift.
