---
id: PERF-431
slug: cdp-screencast
status: complete
completed: 2024-06-03
result: failed
claimed_by: "executor-session"
created: 2024-06-03
---

# PERF-431: Test `Page.startScreencast` as a Capture Strategy with Chromium Flags

## Context & Goal
Currently, `DomStrategy` uses Playwright's `HeadlessExperimental.beginFrame` to capture frames via CDP in a pull-based model. `Page.startScreencast` is an alternative push-based model. Previous attempts at using `Page.startScreencast` (e.g., PERF-380) failed because `Page.startScreencast` does not emit `Page.screencastFrame` events when the browser is launched with external compositor control flags (`--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw`).

This experiment proposes bypassing `HeadlessExperimental.beginFrame` and instead relying on `CdpTimeDriver` to advance virtual time via `Emulation.setVirtualTimePolicy`. The hypothesis is that we can achieve synchronized capturing using `Page.startScreencast` combined with `Emulation.setVirtualTimePolicy` for time advancement *without* requiring the `HeadlessExperimental.beginFrame` flags, potentially pipelining capture and encode more efficiently. We will test this by completely swapping the capture mechanism in `DomStrategy` to `Page.startScreencast`.

The goal is to test if push-based CDP screencast is faster than pull-based `beginFrame` and if time synchronization can be maintained.

## File Inventory
- `packages/renderer/src/core/BrowserPool.ts`
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Architecture
We will remove the `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` flags from `BrowserPool.ts`.
We will modify `DomStrategy.ts` to subscribe to `Page.screencastFrame` and start the screencast using `Page.startScreencast`. A buffer will be maintained for incoming frames. `capture()` will await the next frame from the buffer or wait for one to arrive, and ack it using `Page.screencastFrameAck`.

### Pseudo-Code
```typescript
// In BrowserPool.ts
// Remove these lines from DEFAULT_BROWSER_ARGS
// '--enable-begin-frame-control',
// '--run-all-compositor-stages-before-draw',

// In DomStrategy.ts
// Add properties:
// private frameBuffer: any[] = [];
// private frameResolvers: ((frameData: any) => void)[] = [];

// In prepare():
// this.cdpSession!.send('HeadlessExperimental.enable');
// await this.cdpSession!.send('Page.enable');

// this.cdpSession!.on('Page.screencastFrame', (event) => {
//     const frameData = event.data;
//     if (this.cdpSession) {
//         this.cdpSession.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
//     }
//     if (this.frameResolvers.length > 0) {
//         const resolve = this.frameResolvers.shift();
//         if (resolve) resolve(frameData);
//     } else {
//         this.frameBuffer.push(frameData);
//     }
// });

// await this.cdpSession!.send('Page.startScreencast', {
//     format: this.options.intermediateImageFormat === 'jpeg' ? 'jpeg' : 'png',
//     quality: this.options.intermediateImageQuality || 100,
//     everyNthFrame: 1
// });

// In capture():
// if (this.frameBuffer.length > 0) {
//     const frameData = this.frameBuffer.shift();
//     this.lastFrameData = frameData;
//     return frameData;
// }
// return new Promise((resolve) => {
//     this.frameResolvers.push((frameData: any) => {
//         this.lastFrameData = frameData;
//         resolve(frameData);
//     });
// });
```

### Public API Changes
No public API changes.

### Dependencies
No new dependencies.

## Test Plan
- Performance Benchmark: Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js`.


## Results Summary
- **Best render time**: 31.540s (vs baseline 32.371s)
- **Improvement**: 2.6%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-431]
