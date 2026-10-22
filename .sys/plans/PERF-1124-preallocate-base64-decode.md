---
id: PERF-1124
slug: preallocate-base64-decode
status: unclaimed
claimed_by: ""
created: 2024-10-22
completed: ""
result: ""
---
# PERF-1124: Replace `Buffer.from(str, "base64")` with Pre-allocated Buffer Decode in `CaptureLoop.ts`

## Focus Area
DOM rendering loop (`CaptureLoop.ts`). Target: CPU-bound string decoding phase and Node.js Garbage Collector overhead.

## Background Research
Currently, the DOM strategy returns frames as Base64 strings from Playwright. In the single-worker and multi-worker fast loops inside `CaptureLoop.ts`, we decode these strings dynamically on every frame using `Buffer.from(rawResult as string, "base64")`.
`Buffer.from` dynamically allocates a new contiguous memory space from the V8 heap on every single frame, forcing the Garbage Collector to work constantly to reclaim the old buffers.
Since the composition resolution (width/height) is known and constant, the maximum byte size of an uncompressed RGBA or RGB PNG buffer is fixed and highly predictable for a given render. We can allocate a single large shared ArrayBuffer / Node Buffer upfront, and use `buf.write(rawResult, "base64")` to decode the string into the existing memory block, slicing the exact bytes written before piping them to the stream. This eliminates the per-frame `Buffer` allocation, greatly reducing GC pressure and memory fragmentation in the hot loop.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: 1080p, 60fps, fixed duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: The single largest CPU time sink on the Node thread is string decoding. The GC pauses from dynamic allocation interrupt the flow.

## Implementation Spec

### Step 1: Initialize pre-allocated decode buffer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: At the top of `CaptureLoop.ts` `start()` execution block (or inside the class instance), pre-allocate a large static buffer meant to handle up to 4K resolution PNGs.
`const decodeBuffer = Buffer.allocUnsafe(3840 * 2160 * 4); // Max 4K RGBA size (~33MB)`
**Why**: Ensures we have a fast, zero-init memory block to reuse.
**Risk**: Slightly higher baseline memory usage, but fixed.

### Step 2: Use `buf.write()` to avoid dynamic allocation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Replace all `Buffer.from(rawResult as string, "base64")` instances with:
```typescript
const byteLen = decodeBuffer.write(rawResult as string, 0, "base64");
const buf = decodeBuffer.subarray(0, byteLen); // Zero-copy view
```
**Why**: Avoids dynamic V8 heap allocation. `subarray` is extremely cheap since it just creates a view over the existing memory.
**Risk**: Concurrency. In the multi-worker path (where multiple workers decode strings simultaneously), a *single* shared buffer will cause race conditions. If `hasProcessFn` is false and we are using workers, we must ensure either A) thread-local decode buffers per worker, or B) only apply this optimization to the single-worker pipeline first to measure impact. Let's isolate this to single-worker paths for this experiment.

## Correctness Check
Run the DOM rendering benchmark and compare the final video output frame-by-frame with a baseline to ensure PNGs are cleanly decoded.

## Prior Art
Previous optimizations in this loop (like string pooling) confirmed that reducing JS object allocations helps V8 pipeline execution.
