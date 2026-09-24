---
id: PERF-976
slug: pipeline-single-worker-canvas-capture
status: complete
claimed_by: "Jules"
created: 2024-07-12
completed: ""
result: ""
---

# PERF-976: Pipeline single-worker Canvas capture and processing

## Focus Area
The single-worker Canvas strategy (`!isDomStrategy`) chunked loops in `packages/renderer/src/core/CaptureLoop.ts` (around lines 350-372 and 560-580).

## Background Research
In the single-worker DOM paths, we significantly improved performance by overlapping Chromium rendering (via `domBeginFrame!()`) with Node.js CPU work (Base64 decoding) for the previous frame.
In the single-worker Canvas paths (`!isDomStrategy`), the loop currently awaits the capture of frame `N`, sets the time for frame `N+1`, dispatches the capture for frame `N+1`, and THEN does synchronous processing (like `strategy.processCaptureResult!`) or stream writing for frame `N`.
Although `strategy.capture()` is dispatched before the synchronous processing, `timeDriver.setTime()` might be asynchronous and is `await`ed before `strategy.capture()` is dispatched. By moving the synchronous processing (`buf = strategy.processCaptureResult!(rawResult)` and `stream.write`) to occur *while* `timeDriver.setTime()` is executing (if asynchronous) or just restructuring the block for clarity, we can ensure the CPU work is maximally overlapped.

