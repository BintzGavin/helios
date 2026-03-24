---
id: PERF-053
slug: eliminate-redundant-seeks
status: unclaimed
claimed_by: ""
created: 2026-03-24
completed: ""
result: ""
---

# PERF-053: Eliminate Redundant Animation Seeks in Frame Capture Loop

## Focus Area
The `window.__helios_seek` initialization script within `packages/renderer/src/drivers/SeekTimeDriver.ts`, specifically the duplicate execution of `helios.seek()` and `gsap_timeline.seek()`.

## Background Research
While analyzing the `window.__helios_seek` function injected by `SeekTimeDriver.ts`, a critical redundancy was discovered. The script executes `helios.seek(frame)` and `window.__helios_gsap_timeline__.seek(t)` at the beginning of the evaluation to trigger reactive state updates and discover media elements. However, at the end of the evaluation (after checking for async stability promises), it executes both of these `.seek()` calls *a second time* unconditionally for Helios, and conditionally for GSAP (due to a missing assignment to the `gsapTimelineSeeked` flag).
For the vast majority of frames, `promises.length === 0` (no async stability wait is needed), meaning the script executes the heavy animation framework state updates twice in immediate succession. Eliminating this redundant second seek avoids unnecessary duplicate DOM layout/paint recalculations in Chromium's main thread.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition.
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 31.943s
- **Bottleneck analysis**: The Playwright CDP evaluation overhead is minimal, but the actual JavaScript execution time inside the headless browser (React rendering, GSAP updates, layout calculations) dominates the frame capture latency. Calling the framework seek methods twice per frame effectively doubles this internal CPU cost.

## Implementation Spec

### Step 1: Eliminate Redundant Animation Seeks
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify the `window.__helios_seek` string payload to prevent redundant seeking.
1. Add a `let heliosSeeked = false;` alongside `let gsapTimelineSeeked = false;`.
2. Locate the first execution of `helios.seek` and assign `heliosSeeked = true;`.
3. Locate the first execution of `window.__helios_gsap_timeline__.seek(t)` and assign `gsapTimelineSeeked = true;`.
4. Locate the final GSAP and Helios `.seek()` blocks (listed under "5. After stability, ensure GSAP timelines are seeked"). Wrap this entire section completely inside the `if (promises.length > 0)` block, placing them immediately after `clearTimeout(timeoutId);`. This ensures the redundant seeks only happen if the script had to wait for async resources (like lazy media or fonts) which might have mounted new elements requiring a state flush.
5. In the wrapped final seeks, they can just be executed if `gsapTimelineSeeked` or `heliosSeeked` is true, respectively.

**Why**: By only performing the second seek when an asynchronous yield occurred (which is rare, typically only on frame 0), we halve the animation framework execution time per frame.
**Risk**: If a composition relies on a synchronous side-effect occurring between the first seek and the end of the script to render correctly, it could theoretically miss an update. However, since no event loop yielding occurs when `promises.length === 0`, synchronous state flushes are deterministic and the second seek is demonstrably useless.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts` and `npx tsx packages/renderer/tests/verify-seek-driver-determinism.ts` after making the changes to ensure state initialization and determinism aren't broken.

## Correctness Check
Instruct the Executor to run the test script above to ensure determinism.
