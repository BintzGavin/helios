---
id: PERF-219
slug: reintroduce-sync-compositor-flags
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-219: Reintroduce Synchronous Compositor Flags

## Focus Area
DOM Rendering Pipeline - Chromium Browser Setup in `BrowserPool.ts`.

## Background Research
Disabling threaded animations, threaded scrolling, and checker imaging forces a more synchronous main-thread execution model. This reduces Chromium IPC overhead and improves overall DOM rendering performance in CPU-bound environments. However, these flags are currently missing from `DEFAULT_BROWSER_ARGS`. Reintroducing them could eliminate unnecessary synchronization overhead between the main thread and the compositor thread during the synchronous `HeadlessExperimental.beginFrame` loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1280x720, 30fps, 5s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s
- **Bottleneck analysis**: Synchronization between the main thread and compositor thread in Chromium adds latency to the `beginFrame` command execution.

## Implementation Spec

### Step 1: Add synchronous flags to `DEFAULT_BROWSER_ARGS`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add the following flags to the `DEFAULT_BROWSER_ARGS` array:
- `'--disable-threaded-animation'`
- `'--disable-threaded-scrolling'`
- `'--disable-checker-imaging'`
- `'--disable-image-animation-resync'`

**Why**: These flags force Chromium to handle animations and image decoding synchronously on the main thread, which aligns perfectly with the synchronous `beginFrame` capture loop and avoids inter-thread IPC overhead.
**Risk**: Might cause minor differences in how certain CSS animations are interpolated, but virtual time advancement should negate this.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/run-all.ts`.

## Correctness Check
Run the DOM render tests to ensure no visual regressions break tests.