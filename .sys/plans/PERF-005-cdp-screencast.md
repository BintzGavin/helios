---
id: PERF-005
slug: cdp-screencast
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-005: Bypass Playwright Overhead with Raw CDP Screencast

## Context & Goal
The Frame Capture Loop (phase 4) in `packages/renderer/src/strategies/DomStrategy.ts`. The focus is on reducing the CPU overhead of encoding and decoding intermediate image frames during DOM capture by replacing sequential `page.screenshot()` with a streaming `Page.startScreencast` approach.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec
Currently, Playwright's `page.screenshot()` defaults to generating PNGs. PNG encoding in Chromium and decoding in FFmpeg is extremely CPU-bound and generates large IPC payloads between the Chromium and Node.js processes. `page.screenshot()` involves significant overhead because it asks the browser to capture a single frame, waits for the response, and then proceeds. The `Page.startScreencast` CDP command tells Chrome to actively push frames to Node.js as they are rendered. By listening to `Page.screencastFrame`, acknowledging it via `Page.screencastFrameAck`, and advancing the `TimeDriver`, we can pipeline the capture process, reducing the request-response latency of individual screenshots and significantly speeding up the DOM rendering pipeline.

### Step 1: Initialize CDP Session in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Add a private property `cdpSession: CDPSession | null = null;` to the `DomStrategy` class. In the `prepare(page: Page)` method, initialize it using `this.cdpSession = await page.context().newCDPSession(page);`.
**Why**: We need an active CDP session to send raw commands and listen for screencast events.
**Risk**: Low. CDP sessions are standard in Playwright.

### Step 2: Implement Screencast Listener
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In `prepare(page: Page)`, start the screencast: `await this.cdpSession.send('Page.startScreencast', { format: 'jpeg', quality: 100 });`. Set up a listener for `Page.screencastFrame`: `this.cdpSession.on('Page.screencastFrame', (event) => { ... })`. The listener should store the incoming frame data (base64) and immediately send `Page.screencastFrameAck` with the `sessionId`. Use a Promise resolution queue to link the incoming frames to the `capture()` method requests.
**Why**: This switches the architecture from pull (requesting a screenshot per frame) to push (Chrome sending frames as they render).
**Risk**: High. Synchronization between the `TimeDriver` advancing virtual time and Chrome emitting the corresponding frame is complex and could lead to mismatched frames or deadlocks.

### Step 3: Replace page.screenshot in capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In the `capture(page: Page, frameTime: number)` method, instead of `page.screenshot()`, wait for the next frame from the Promise queue populated by the `screencastFrame` listener. Convert the base64 data to a Buffer and return it. Handle `targetSelector` fallback if necessary.
**Why**: This consumes the frames pushed by Chrome.
**Risk**: High. Frame timing must be perfectly synchronized.

## Test Plan
Run a standard Canvas smoke test. The changes should not negatively impact the Canvas path.
1. Ensure all frames are captured in the correct order.
2. Verify that the output video perfectly matches the composition timing.

## Variations
### Variation A: WebP Screencast
If `jpeg` screencasting is successful, experiment with `webp` (if supported by `startScreencast` or by combining with `PERF-004`) to regain alpha channel support while maintaining the streaming performance benefits.