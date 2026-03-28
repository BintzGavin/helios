---
id: PERF-090
slug: virtual-time-policy
status: unclaimed
claimed_by: ""
created: 2024-06-18
completed: ""
result: ""
---

# PERF-090: Native CDP Virtual Time Policy

## Focus Area
DOM rendering performance bottleneck inside `SeekTimeDriver.ts`. Eliminating heavyweight JavaScript execution (V8 JS parsing, GC micro-stalls, complex DOM selection logic) on every frame by leveraging Chromium's native C++ compositor virtual time via CDP.

## Background Research
The `SeekTimeDriver` relies heavily on injected JavaScript (`window.__helios_seek`) evaluated thousands of times via `Runtime.evaluate`. It manually syncs Web Animations API, GSAP timelines, offsets dates, and checks document fonts.
However, Playwright and Puppeteer support native deterministic rendering through Chromium's `Emulation.setVirtualTimePolicy`. Setting the policy to `pause`, and explicitly calling `advance` with a specific `budget` (e.g., 33.3ms for 30 FPS) automatically syncs native DOM timers, CSS transitions, and WAAPI animations synchronously at the C++ level without touching the V8 engine JS context on every frame.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1280x720, 30 FPS, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s
- **Bottleneck analysis**: IPC overhead and V8 GC churn from `Runtime.evaluate` of `window.__helios_seek` on every single frame.

## Implementation Spec

### Step 1: Initialize Virtual Time
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Inside `prepare()`, after getting the `this.cdpSession`, call `await this.cdpSession.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })`. Remove the injected `window.__helios_seek` complex script evaluation logic entirely, leaving only basic setup if needed.
**Why**: Stops the native clock, preparing Chromium for manual, perfectly synchronized frame advancement.

### Step 2: Advance Time via CDP
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Inside `setTime(page, timeInSeconds)`, calculate the delta from the previous time. Replace `Runtime.evaluate` with `await this.cdpSession.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: deltaMs })`. Ensure the promise resolves after the budget is consumed (Chromium sends `Emulation.virtualTimeBudgetExpired` which Playwright's CDP wrapper manages, or you wait for the event explicitly).
**Why**: Instantly advances all native animations (WAAPI, CSS) natively in C++ without JavaScript intervention.
**Risk**: Does not sync non-standard JavaScript loops if they aren't tied to `requestAnimationFrame` or `setTimeout` natively, but Helios specifically binds logic to `requestAnimationFrame`.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure animations still align correctly.

## Prior Art
Puppeteer internal implementation of deterministic rendering and `TimeDriver` logic using native `virtualTimeBudget`.
