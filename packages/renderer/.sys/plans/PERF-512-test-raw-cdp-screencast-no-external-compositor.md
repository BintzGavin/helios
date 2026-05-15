---
id: PERF-512
slug: test-raw-cdp-screencast-no-external-compositor
status: unclaimed
claimed_by: ""
created: 2024-05-15
completed: ""
result: ""
---

# PERF-512: Test Raw CDP Screencast without External Compositor Control

## Focus Area
`BrowserPool.ts` (browser args) and `DomStrategy.ts` capture loop.

## Background Research
Previous attempts to use `Page.startScreencast` failed because Chromium's external compositor control (`--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw`) suppresses damage-driven screencast frames when there's no visual damage, leading to deadlocks. As noted in PERF-431, "A simple buffer system without fallback causes deadlocks during static scenes, and modifying tests to ignore the external compositor flags bypasses core framework guarantees." However, if we drop those flags and rely solely on `Emulation.setVirtualTimePolicy` to advance the clock, we might be able to use `startScreencast` efficiently if we can handle the lack of deterministic frame emission during static scenes by using a fallback timeout to simply repeat the last received frame.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.515s
- **Bottleneck analysis**: IPC overhead of `HeadlessExperimental.beginFrame` and PNG/JPEG decoding in the hot loop.

## Implementation Spec

### Step 1: Remove External Compositor Flags
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Remove `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` from `DEFAULT_BROWSER_ARGS`.

### Step 2: Implement Screencast Strategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- In `prepare()`, start the screencast using `this.cdpSession!.send('Page.startScreencast', { format: 'jpeg', quality: 90 })`.
- Add an event listener for `Page.screencastFrame` that stores the latest frame data and sends `Page.screencastFrameAck`.
- In `capture()`, instead of calling `beginFrame`, wait for a new screencast frame to arrive with a short timeout. If the timeout triggers (indicating no damage), fall back to returning `this.lastFrameData`.

## Correctness Check
Verify DOM output is still correct, specifically that animations and transitions remain smooth and accurately timed without external compositor control.
