---
id: PERF-853
slug: overlap-time-seek-with-base64-decode
status: complete
claimed_by: "executor"
created: 2026-06-25
completed: "2026-06-25"
result: "improved"
---

# PERF-853: Reapply Time Seek Overlap with Base64 Decode in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast path (single-worker loop with `hasProcessFn` true, specifically the `isDomStrategy` string path).

## Background Research
During the PERF-824 refactor (which inlined `DomStrategy` capture logic), the Time Seek overlap optimization (originally from PERF-830) was inadvertently lost in the `hasProcessFn` branch.

In the current `CaptureLoop.ts` single-worker string loop (around line 273), the order of operations per frame is:
1. `const rawResult = await nextCapturePromise;` (wait for Chromium to return the screenshot)
2. `const timePromise = timeDriver.setTime(...);` (send CDP `Runtime.evaluate` to advance virtual time)
3. `if (timePromise) await timePromise;` (block event loop waiting for Chromium to evaluate time)
4. `nextCapturePromise = domBeginFrame!();` (send CDP `HeadlessExperimental.beginFrame` to capture next frame)
5. Base64 decode string to buffer (CPU-bound)
6. Write to FFmpeg stdin

Because of step 3, the Node.js event loop blocks on the network/IPC bound `timePromise` *before* it begins decoding the Base64 frame from the previous capture. By rearranging the operations, we can overlap the CPU-bound Base64 decoding with the I/O-bound `timePromise` (the CDP roundtrip to Chromium).

Optimized ordering:
1. `const rawResult = await nextCapturePromise;`
2. `const timePromise = timeDriver.setTime(...);` (Start CDP request to advance time)
3. Base64 decode string to buffer (CPU decode while CDP request is inflight to Chromium)
4. `if (timePromise) await timePromise;` (Ensure time is updated before triggering capture)
5. `nextCapturePromise = domBeginFrame!();` (Trigger next capture)
6. Write to FFmpeg stdin

This allows Chromium's V8 to evaluate `seekTo()` while Node's V8 is decoding the Base64 screenshot, reducing the overall time per frame. This needs to be applied to both the `if (i < totalFrames - 1)` branch and the `else` branch within the string loop if applicable (though the `else` branch doesn't issue a next capture, it still shouldn't block decoding on the final seek if one happens).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Sequential execution of I/O (time seek) and CPU (Base64 decoding) in the main loop instead of overlapping them.

## Implementation Spec

### Step 1: Reorder operations in the single-worker `isDomStrategy` string path (`hasProcessFn` = true)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `if (isString)` -> `if (isDomStrategy)` branch (around line 273), modify the loop body to overlap `setTime` with decoding.

Specifically, in the `if (i < totalFrames - 1)` block:
1. Keep `const rawResult = await nextCapturePromise;`
2. Keep `const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);`
3. MOVE `if (timePromise) await timePromise;` and `nextCapturePromise = domBeginFrame!();` down, AFTER the base64 decoding logic (after `const chunk = pooled.buffer.subarray(0, written);`).
4. Keep the FFmpeg write logic (`pendingBytes += written;` and `stream.write(...)`) at the end.

**Why**: This initiates the CDP `Runtime.evaluate` command to advance virtual time, and while waiting for Chromium to process it and respond, Node.js performs the expensive CPU task of decoding the Base64 image chunk.
**Risk**: Negligible, this restores a proven optimization.

## Variations
Check the `else` branch (around line 309, `if (!isDomStrategy)`). If it also does `timePromise = ...; if (timePromise) await timePromise; nextCapturePromise = ...;` before base64 decoding, apply the same overlap there.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode canvas` to ensure `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script to verify output is unchanged.

## Prior Art
- PERF-830: Original overlap implementation
- PERF-824: The refactor that accidentally lost this overlap
