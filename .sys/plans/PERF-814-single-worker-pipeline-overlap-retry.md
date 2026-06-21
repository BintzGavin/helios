---
id: PERF-814
slug: single-worker-pipeline-overlap-retry
status: complete
claimed_by: ""
created: 2024-06-21
completed: ""
result: improved
---

# PERF-814: Single-Worker Pipeline Overlap (Retry)

## Focus Area
`CaptureLoop.ts` fast paths (single worker loop).

## Background Research
PERF-812/PERF-813 attempted to pipeline the single-worker loop by introducing a 1-frame lookahead, executing the CDP capture for frame N+1 concurrently with the CPU-bound Base64 decoding and stream writing of frame N.

However, PERF-813 had the correct analysis but it was wrongly discarded again due to an environment timeout bug where node modules were not installed. The test harness was missing dependencies in the executor.

By pre-firing the asynchronous `HeadlessExperimental.beginFrame` command *before* processing the buffer allows Chromium to render the next frame entirely in the background while Node.js occupies the CPU converting and writing the data. This provides the exact pipeline parallelism the multi-worker model attempts to achieve, but without the massive IPC/Promise overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s
- **Bottleneck analysis**: Node.js CPU time spent decoding Base64 string blocks the next CDP frame capture command from being dispatched, leaving Chromium idle.

## Implementation Spec

### Step 1: Implement 1-Frame Lookahead Pipeline
**File**: `packages/renderer/src/core/CaptureLoop.ts`

Modify the single-worker loop (both the `hasProcessFn` path and the `else` path) to pre-fire the capture of the next frame while processing the current one. Use a look-ahead variable (`nextCapturePromise`) to hold the promise for the next frame's capture result.

Pseudo-code:

```typescript
let nextCapturePromise = null;

if (totalFrames > 0) {
   // Setup time and fire capture for frame 0
   timeDriver.setTime(0);
   nextCapturePromise = strategy.capture(0);
}

for (let i = 0; i < totalFrames; i++) {
   // Wait for current frame's capture to complete
   const rawResult = await nextCapturePromise;

   // Fire capture for frame i+1 if there are more frames
   if (i + 1 < totalFrames) {
       timeDriver.setTime(i + 1);
       nextCapturePromise = strategy.capture(i + 1);
   }

   // Process current frame
   const buffer = strategy.processCaptureResult(rawResult);
   // ... rest of the stream writing logic
}
```

Apply this same structural change to both the `if (hasProcessFn)` branch and the `else` branch of the single-worker loop.

**Why**: By triggering `strategy.capture(page, (i+1)*timeStep)` *before* processing the buffer for frame `i`, Chromium begins rendering the next frame in the background via CDP. This overlaps Chromium's work with the CPU-bound Node.js tasks (Base64 decode, stream.write, and progress console logging), significantly reducing total wall-clock time per frame.

## Canvas Smoke Test
**NOTE:** Do not run `--mode canvas` on the DOM benchmark composition, as it will timeout waiting for a `<canvas>` element that doesn't exist. To test the Canvas path, you must provide a valid canvas composition. But since this change modifies core CaptureLoop paths shared by both, running `npm run build` and verifying the tests in `packages/player` pass is sufficient.

## Correctness Check
Run the `dom` mode benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts --mode dom`. Ensure frames are captured completely, progress ticks normally, and no "Timeout" or frame corruption occurs.

## Prior Art
- PERF-813 proposed this exact change but was wrongly discarded due to a test harness failure (missing dependencies timeout).