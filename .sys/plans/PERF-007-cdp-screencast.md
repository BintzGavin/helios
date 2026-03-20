---
id: PERF-007
slug: cdp-screencast
status: unclaimed
claimed_by: ""
created: 2026-03-20
completed: ""
result: ""
---

# PERF-007: Bypass Playwright Overhead with Raw CDP Screencast

## Context & Goal
The Frame Capture Loop (phase 4) in `packages/renderer/src/strategies/DomStrategy.ts`. The focus is on reducing the CPU overhead of encoding and decoding intermediate image frames during DOM capture by replacing sequential `page.screenshot()` with a streaming `Page.startScreencast` approach.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Background Research
Currently, Playwright's `page.screenshot()` defaults to generating PNGs. PNG encoding in Chromium and decoding in FFmpeg is extremely CPU-bound and generates large IPC payloads between the Chromium and Node.js processes. `page.screenshot()` involves significant overhead because it asks the browser to capture a single frame, waits for the response, and then proceeds. The `Page.startScreencast` CDP command tells Chrome to actively push frames to Node.js as they are rendered. By listening to `Page.screencastFrame`, acknowledging it via `Page.screencastFrameAck`, and advancing the `TimeDriver`, we can pipeline the capture process, reducing the request-response latency of individual screenshots and significantly speeding up the DOM rendering pipeline.

## Baseline
- **Bottleneck analysis**: The microVM CPU is heavily saturated during `page.screenshot()`.

## Implementation Spec

### Step 1: Initialize CDP Session and Screencast Queue
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- Add private properties: `cdpSession: any | null = null`, `frameQueue: Buffer[] = []`, `frameResolver: ((buffer: Buffer) => void) | null = null`.
- In `prepare(page: Page)`, initialize the CDP session: `this.cdpSession = await page.context().newCDPSession(page);`.
- Setup a listener for `Page.screencastFrame`. The callback should parse the `data` (base64 string) into a `Buffer`. Send `Page.screencastFrameAck` with the `sessionId`. Push the `Buffer` to `frameQueue`. If `frameResolver` is set, resolve it and clear it.
- Send the `Page.startScreencast` command: `await this.cdpSession.send('Page.startScreencast', { format: 'jpeg', quality: 100 });`
**Why**: We need an active CDP session to send raw commands and listen for screencast events. This transitions the architecture from a pull model to a push model.
**Risk**: Synchronizing the pushed frames with the `TimeDriver` virtual time could be complex.

### Step 2: Consume Screencast Frames
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In `capture(page: Page, frameTime: number)`, instead of calling `page.screenshot()`, check `frameQueue`. If it has frames, `shift()` one and return it. If empty, create a new `Promise` and set `frameResolver`. Return the promise.
- Handle the `targetSelector` case: fallback to Playwright's `element.screenshot(...)` if a specific element is targeted, or apply a bounding box crop to the screencast frame.
**Why**: This consumes the frames pushed by Chrome, avoiding Playwright's actionability and stability loops.
**Risk**: Frame timing must be perfectly synchronized with virtual time advancement.

## Variations
### Variation A: WebP Screencast
If `jpeg` screencasting is successful, experiment with `webp` (if supported by `startScreencast`) to regain alpha channel support while maintaining the streaming performance benefits.

## Canvas Smoke Test
Run a standard Canvas smoke test (`npm run test` or specific tests). The changes should not negatively impact the Canvas path.

## Correctness Check
Verify that `mode: 'dom'` captures frames in chronological order without deadlocking.

## Prior Art
- Playwright page.screenshot overhead: Standard knowledge in performance-sensitive scraping contexts is to drop down to raw CDP for screenshots.
