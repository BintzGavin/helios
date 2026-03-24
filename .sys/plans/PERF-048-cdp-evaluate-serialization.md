---
id: PERF-048
slug: cdp-evaluate-serialization
status: complete
claimed_by: "executor-session"
created: 2024-05-28
completed: "2024-05-28"
result: "discard"
---
# PERF-048: Eliminate CDP Evaluate Serialization and Synchronous Logs

## Focus Area
DOM Rendering Frame Capture Overhead. This targets the synchronous CDP communication overhead caused by `Runtime.evaluate` return value serialization and repetitive console warnings during the hot loop in `SeekTimeDriver.ts`.

## Background Research
In `SeekTimeDriver.ts`, the frame capture loop uses `Runtime.evaluate` via CDPSession to execute `window.__helios_seek` and waits for the promise to resolve. Currently, `returnByValue: true` is set. Although `__helios_seek` returns `undefined`, V8 still allocates and serializes a return object over IPC on every frame. Furthermore, if a composition does not use GSAP, `__helios_seek` fires a `console.warn` on every single frame. Console logging over CDP is synchronous and blocks execution while V8 serializes the log message and stack trace to Node.js. In a pipeline of 150+ frames across multiple workers, this generates significant blocking IPC traffic.

## Benchmark Configuration
- **Composition URL**: `examples/simple-animation/output/example-build/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: IPC communication and V8 serialization overhead due to `returnByValue: true` and repetitive synchronous `console.warn` calls per frame.

## Implementation Spec

### Step 1: Remove returnByValue from Runtime.evaluate
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `SeekTimeDriver.ts` around line 221, locate the `Runtime.evaluate` call in `setTime` and change `returnByValue: true` to `returnByValue: false`.
**Why**: Avoids serializing the return object over IPC. We only care about `exceptionDetails`.
**Risk**: Minimal. We don't use the return value anyway.

### Step 2: Eliminate Repetitive Console Warnings
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `window.__helios_seek` script, around line 171, remove or comment out the `console.warn('[SeekTimeDriver] GSAP timeline not available - relying on Helios subscription');` inside the `else if (!gsapTimelineSeeked)` block.
**Why**: Prevents synchronous CDP logging overhead on every frame for non-GSAP animations.
**Risk**: Minimal. It was just a diagnostic warning, but it spams the console.

## Variations
None.

## Canvas Smoke Test
Run the Canvas baseline script to ensure basic rendering still works.
`npx tsx scripts/render.ts`

## Correctness Check
Run the DOM render script and verify output exists, has valid video contents, and does not crash.
`npx tsx scripts/render-dom.ts`

## Prior Art
- PERF-031: Explored `Runtime.callFunctionOn` vs `Runtime.evaluate`, finding V8 string evaluation caching is highly optimized. Eliminating the return serialization is the next logical step.

## Results Summary
- **Best render time**: 33.243s (vs baseline 33.243s)
- **Improvement**: 0%
- **Kept experiments**: none
- **Discarded experiments**: disabled cdp return by value and removed console warn (already implemented in PERF-049)
