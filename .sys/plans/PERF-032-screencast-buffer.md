---
id: PERF-032
slug: screencast-buffer
status: unclaimed
claimed_by: ""
created: 2026-03-22
completed: ""
result: ""
---

# PERF-032: Parallel Screencast with Local Buffer Queues

## Focus Area
DOM Frame Capture Loop (`strategy.capture`). Specifically, replacing polling CDP screenshots with continuous `Page.startScreencast`.

## Background Research
Previous experiment `PERF-026` attempted to use `Page.startScreencast` but failed because the screencast mechanism in Chromium is "damage-driven" (it only emits frames when the visual viewport changes). This caused hangs in the strictly synchronized sequential loop.
However, if we trigger forced layout/paint in the browser after each `timeDriver.setTime()` evaluation, we can force Chromium to emit exactly one screencast frame for every virtual time update, even if the composition is static. We can buffer these asynchronous `ScreencastFrame` events in `DomStrategy` and pull from this buffer in `Renderer.ts`, effectively breaking the sequential IPC bottleneck of `Page.captureScreenshot`.

The current IPC roundtrip for `Page.captureScreenshot` averages 60-80ms. `startScreencast` streams buffers directly to a registered event listener, entirely overlapping capture with the next virtual time update in `SeekTimeDriver`.

## Benchmark Configuration
- **Composition URL**: `https://example.com`
- **Render Settings**: 1280x720, 30 FPS, 10s duration (300 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.324s (from PERF-030)
- **Bottleneck analysis**: IPC latency of `Page.captureScreenshot`

## Implementation Spec

### Step 1: Update `DomStrategy` to Use Screencast
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- Update `prepare()` to send `Page.startScreencast` via `cdpSession`.
- In `prepare()`, listen to `Page.screencastFrame`, storing incoming frames in an internal queue and immediately acknowledging them with `Page.screencastFrameAck`.
- Update `capture()` to wait for and dequeue the next available frame from the internal queue instead of calling `captureScreenshot`.

### Step 2: Ensure Deterministic Damage in `SeekTimeDriver`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
- To overcome the "damage-driven" limitation of screencast, inject a forced repaint trigger in `__helios_seek` so the browser considers the frame "damaged" and emits a `ScreencastFrame`. A simple transparent `div` toggled on/off, or modifying a CSS variable on the body, ensures Chromium registers visual changes on every tick.

## Variations
### Variation A: Forced Repaint via CSS Transforms
Instead of modifying the DOM, use a micro-translation on `document.body` (e.g., `translateZ(0.01px)`) and toggle the sign each frame to ensure layout damage without visible artifacts.

## Canvas Smoke Test
Run `npx tsx scripts/render.ts` to ensure Canvas mode remains unbroken.

## Correctness Check
Run the DOM rendering tests: `npx tsx tests/verify-codecs.ts` and ensure `DomStrategy` captures correctly. Ensure no hangs occur on static scenes (the primary reason PERF-026 failed).
