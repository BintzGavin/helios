---
id: PERF-971
slug: hoist-dombeginframe-multi-worker-nodeprocess-true
status: unclaimed
claimed_by: ""
created: 2024-07-10
completed: ""
result: ""
---

# PERF-971: Hoist domBeginFrame before Base64 Decode in Multi-Worker Loop (hasProcessFn = true)

## Focus Area
The multi-worker DOM strategy chunked loop in `packages/renderer/src/core/CaptureLoop.ts` when `hasProcessFn` is true (around lines 750-780).

## Background Research
PERF-960, PERF-878, and PERF-970 successfully optimized DOM loops by overlapping CPU-bound operations with Chromium rendering. By invoking `domBeginFrame!()` to dispatch the capture command for frame N+1 before doing synchronous operations on frame N, Chromium can generate pixels concurrently with Node's CPU work.

In the multi-worker `hasProcessFn = true` path, the chunk loop currently reads:
```typescript
              try {
                timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                let buffer: any;
                const rawResult = await domBeginFrame!();
                const data = rawResult.screenshotData;
                let buf: Buffer;
                if (data || !domLastFrameBuffer) {
                  if (data) domLastFrameData = data;
                  buf = Buffer.from(domLastFrameData as string, "base64");
                  domLastFrameBuffer = buf;
                } else {
                  buf = domLastFrameBuffer;
                }
                buffer = buf;
                frameBufferRing[ringIndex] = buffer;

              } catch (e) {
```

The multi-worker loop does not pre-fetch the next frame like the chunked single worker loop because of synchronization issues found in PERF-879 (which corrupted the synchronized timestamps).

Wait, the multi-worker loop doesn't have a `nextCapturePromise` because each worker loop is fetching exactly one frame at `i = nextFrameToSubmit++`. Eagerly fetching the next frame by stepping `nextFrameToSubmit` and calling `timeDriver.setTime()` before the current frame is written caused frame timing regressions in Shadow DOM synchronization (verified by `verify-cdp-shadow-dom-sync.ts`), which is why PERF-879 was discarded.

Wait, if we can't pre-fetch the next frame in the multi worker path, we can't overlap it with Base64 decode. The single worker pipeline overlaps N+1's capture with N's CPU decode. In the multi worker path, there's no N+1 for this particular worker thread, it must wait for the writer thread to release it to get another task.

Wait, what else is un-optimized?
Let's look at `CaptureLoop.ts` around `hasProcessFn = true`.
What if we avoid dynamic type evaluation or simplify the `hasProcessFn` condition for the multi-worker loop?
Ah, if `hasProcessFn = true`, there's a `isDomStrategy` check inside.

Wait, what did PERF-960 and PERF-970 do?
PERF-970: Hoist domBeginFrame before Base64 Decode in Single-Worker Loop (hasProcessFn = true).
PERF-960: Hoist domBeginFrame before Base64 Decode in Single-Worker Loop (hasProcessFn = false).
PERF-878: Overlap domBeginFrame with Base64 Decode in DOM Fast Paths.

So the single worker chunked loops are fully optimized.

Let's look for other optimizations. What about `isDomStrategy`?
```typescript
              try {
                timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                let buffer: any;
                const rawResult = await domBeginFrame!();
                const data = (rawResult as any).screenshotData;
```
Here, in the `hasProcessFn = false` branch for multi-workers (around line 840):
```typescript
          if (isDomStrategy) {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              let i: number;
              // ...
              try {
                timeDriver.setTime(
                  page,
                  (startFrame + i) * compTimeStep,
                );
                let buffer: any;
                const rawResult = await domBeginFrame!();
                const data = (rawResult as any).screenshotData;
                let buf: Buffer;
                if (data || !domLastFrameBuffer) {
                  if (data) domLastFrameData = data;
                  buf = Buffer.from(domLastFrameData as string, "base64");
                  domLastFrameBuffer = buf;
                } else {
                  buf = domLastFrameBuffer;
                }
                buffer = buf;
                frameBufferRing[ringIndex] = buffer;
```
This looks almost identical to the `hasProcessFn = true` `isDomStrategy` branch!
Wait, if `isDomStrategy` is true, does it matter if `hasProcessFn` is true or false?
`hasProcessFn` is `!!strategy.processCaptureResult`. Does `DomStrategy` have `processCaptureResult`? No, it's a DOM strategy. It returns screenshotData directly.

Wait, why are there two `isDomStrategy` branches in the multi-worker path?
```typescript
        if (hasProcessFn) {
          if (isDomStrategy) {
            // ...
          } else {
            // ...
          }
        } else {
          if (isDomStrategy) {
            // ...
          } else {
            // ...
          }
        }
```
If `isDomStrategy` is true, the strategy is `DomStrategy`. `DomStrategy` does not have `processCaptureResult`. Thus `hasProcessFn` is always `false` when `isDomStrategy` is true.
So the `hasProcessFn = true` and `isDomStrategy = true` branch is fundamentally unreachable dead code!

Let's verify this hypothesis.
