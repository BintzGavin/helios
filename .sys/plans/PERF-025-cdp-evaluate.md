---
id: PERF-025
slug: cdp-evaluate
status: unclaimed
claimed_by: ""
created: 2026-03-22
completed: ""
result: ""
---
# PERF-025: Eliminate IPC overhead during DOM render setTime calls

## Focus Area
The `SeekTimeDriver` handles setting the composition time for every frame during DOM rendering. It invokes an evaluated script on the Playwright `page`.

Currently, `SeekTimeDriver.setTime` evaluates the main sync function inside `page.evaluate(...)` for every frame. However, this incurs unnecessary IPC roundtrips between Node.js and Playwright, and within Playwright's execution context.

To minimize this IPC overhead, we can use the `CDPSession` directly via the `Runtime.evaluate` command. By doing this, we bypass the Playwright abstraction layer which parses and serializes the call across its IPC boundaries.

## Background Research
Playwright's `page.evaluate()` adds safety abstractions (such as argument serialization and execution context tracking) that incur a small cost on every call. In the hot loop of frame capture, this cost adds up.

Using `CDPSession.send('Runtime.evaluate')` directly with the pre-compiled `window.__helios_seek(t, timeoutMs)` function avoids the Playwright `evaluate` abstraction and invokes the JS engine much closer to the metal. We've verified this via a small proof-of-concept that shows marginal reductions in total render time.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 150 frames, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.013s
- **Bottleneck analysis**: IPC communication accounts for a noticeable portion of per-frame render overhead.

## Implementation Spec

### Step 1: Initialize CDPSession in SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Add a private property to hold the CDP Session in the class.
In the `prepare` method, initialize this property by calling `newCDPSession` on the page context before evaluating the `initScript`.

**Why**: This provides a raw CDP session to bypass Playwright's `page.evaluate` abstraction.
**Risk**: If CDP crashes or disconnects, it might affect execution, but this is already handled cleanly by Playwright's process management.

### Step 2: Use Runtime.evaluate instead of page.evaluate
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify the `setTime` method. Instead of using `page.evaluate()`, use the CDP session:
Send a `Runtime.evaluate` command using the initialized client, executing the pre-compiled `__helios_seek` function with the provided time and timeout as arguments. Wait for the promise to complete and return by value.

**Why**: Direct execution avoids the `page.evaluate` IPC serialization overhead.
**Risk**: This assumes the script runs entirely synchronously or handles promises gracefully within the browser, which the current seek implementation does.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/render.ts`. Expect to see FFmpeg error out (as no GPU is present), but capture logic should remain functional.

## Correctness Check
Verify `dom-animation.mp4` renders correctly with synchronized animations.