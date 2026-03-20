---
id: PERF-009
slug: explicit-cdp-capture
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-009: Explicit CDP Capture (Eliminate Screencast and Timeout)

## Focus Area
The Frame Capture Loop in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
Currently, `DomStrategy` uses `Page.startScreencast` to asynchronously receive frames. To sync this with virtual time, it advances the time, waits for `requestAnimationFrame`, and then waits up to 50ms for the screencast event to arrive over IPC. If it doesn't arrive, it falls back to `Page.captureScreenshot`.
In a CPU-bound microVM without a GPU, painting and encoding a frame to PNG often takes longer than 50ms. This means the screencast event is likely frequently late, causing the loop to idle for 50ms, then trigger a redundant `Page.captureScreenshot` (implemented in PERF-008).
By eliminating `Page.startScreencast` entirely and simply calling `Page.captureScreenshot` directly after `requestAnimationFrame`, we remove the 50ms artificial delay and reduce IPC noise from the screencast system.

## Baseline
- **Current estimated render time**: 53.379s (from `.jules/RENDERER.md`)
- **Bottleneck analysis**: The 50ms `setTimeout` in `DomStrategy.capture` is acting as an artificial sleep loop for every frame that takes longer than 50ms to paint/encode because `Page.screencastFrame` events arrive late.

## Implementation Spec

### Step 1: Remove `Page.startScreencast`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In `prepare()`, remove the `this.cdpSession.on('Page.screencastFrame', ...)` event listener and the `await this.cdpSession.send('Page.startScreencast', ...)` call. We will no longer use the screencast API.

### Step 2: Refactor `capture()` to use explicit `Page.captureScreenshot`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, after waiting for `requestAnimationFrame`, immediately call `this.cdpSession.send('Page.captureScreenshot', captureParams)` and return the buffer. Remove the `setTimeout`, `frameQueue`, and `frameResolver`. Keep the ultimate fallback to `page.screenshot(screenshotOptions)` in case `this.cdpSession` is unexpectedly falsy.

### Step 3: Remove Screencast Cleanup
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In `finish()`, remove the `await this.cdpSession.send('Page.stopScreencast').catch(() => {});` call.

## Variations
### Variation A: Format specific capture
Ensure that the `captureParams` specify `format` and `quality` parameters identical to what was previously used in the fallback CDP command.

## Canvas Smoke Test
Run a standard Canvas smoke test. The DomStrategy changes should not affect Canvas rendering, but ensure that `npm run test --prefix packages/renderer` passes.

## Correctness Check
Verify transparency support still works (it uses the same format options in `captureScreenshot`). Ensure output video is identical in quality by comparing test outputs. Ensure no skipped frames.
