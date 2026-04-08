---
id: PERF-216
slug: disable-threaded-compositing
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-216: Disable Component/Layout Resync in Chromium via Single Process Disabling Feature Flags

## Focus Area
Browser Architecture / Process Flags

We observed that `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, and `--disable-image-animation-resync` regressed performance in the past (PERF-109), likely because they forced synchronous execution on the main thread in a multi-process Chromium, defeating IPC concurrency benefits. However, a less-intrusive set of Chromium feature flags could yield rendering improvements without causing a regression or hanging the pipeline, particularly those related to layout resyncs and compositor synchronization.

This experiment disables some of the heavy layout features related to threaded compositing explicitly, aiming to simplify the compositing pipeline in the CPU-bound microVM:
`--disable-features=ThreadedCompositing,PaintHolding` and `--disable-threaded-compositing`

## Background Research
- `--disable-threaded-compositing`: Forces Chromium to perform compositing on the main thread rather than maintaining a separate compositor thread. Since the environment is CPU-bound with no GPU, separating the compositor thread often incurs IPC and scheduling overhead that outweighs its benefits for deterministic, frame-by-frame rendering.
- `PaintHolding`: Prevents Chromium from waiting for paint to hold before committing.

## Baseline
- **Current estimated render time**: ~32.595s
- **Bottleneck analysis**: Multithreaded compositing incurs overhead in environments without hardware acceleration, particularly when we explicitly trigger frame updates deterministically via CDP.

## Implementation Spec

### Step 1: Add `--disable-threaded-compositing` and Feature Flags
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**: Add `--disable-threaded-compositing` and `--disable-features=PaintHolding,ThreadedCompositing` to the `DEFAULT_BROWSER_ARGS` array.
**Why**: Forces compositing onto the main thread, reducing inter-thread communication and synchronization overhead when rendering deterministically without a GPU.
**Risk**: Main thread could become overwhelmed, slowing down DOM execution.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the Canvas path still works.

## Correctness Check
Run the DOM smoke tests (`npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`) to ensure deterministic rendering is not broken.