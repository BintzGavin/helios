---
id: PERF-966
slug: cache-decoded-buffer-unchanged-frames-multi-worker
status: complete
claimed_by: "jules"
created: 2024-07-10
completed: ""
result: ""
---

# PERF-966: Cache Decoded Base64 Buffers for Unchanged Frames in Multi-Worker Loop

## Focus Area
The multi-worker DOM strategy loops in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
PERF-965 successfully optimized the single-worker DOM hot path by caching decoded Base64 `Buffer` objects for unchanged frames.
In the multi-worker path, `runWorker` caches `domLastFrameData` (a string). It pushes this string to `frameBufferRing`. Then, the writer loop reads the string and decodes it via `Buffer.from(str, "base64")` right before writing.
If we want to cache decoded buffers for duplicate frames in multi-worker, we need to push the *decoded buffer* into `frameBufferRing` and update the writer loop to stop decoding it.

## Implementation Spec
1. Modify `runWorker` (multi-worker) initialization:
   Add `let domLastFrameBuffer: Buffer | null = null;`
2. Modify `runWorker` `hasProcessFn` path for `isDomStrategy`:
   Instead of just caching string in `domLastFrameData`, check if we have new data. If so, decode and cache as `domLastFrameBuffer`. Then push `domLastFrameBuffer` to `frameBufferRing`.
3. Modify `runWorker` `!hasProcessFn` path for `isDomStrategy`:
   Do the same caching logic.
4. Modify the multi-worker writer loops:
   The writer loop (`isDomStrategyWriter`) currently does `const str = buffer as string; writeSuccess = stream.write(Buffer.from(str, "base64"));`
   Change this to use the buffer directly: `pendingBytes += buffer.length; writeSuccess = stream.write(buffer);`
   Also update the chunked loops in the writer to not do `Buffer.from(buffer, "base64")`.

## Results Summary
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	0.888	120	135.1	120.0	keep	Cache Decoded Base64 Buffers for Unchanged Frames in Multi-Worker Loop
