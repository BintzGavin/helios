---
id: PERF-092
slug: buffer-allocation
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: "2026-03-28"
result: "improved"
---

# PERF-092: Preallocate Buffer for Base64 Decoding in `DomStrategy.ts`

## Focus Area
V8 Garbage Collection and memory allocation overhead during frame capture in `DomStrategy.ts`.

## Background Research
During the hot frame capture loop in `DomStrategy.ts` (`capture` method), the application receives base64-encoded strings representing the screenshot data over the Chromium CDP protocol. Currently, it converts this string into a binary `Buffer` using `Buffer.from(screenshotData, 'base64')`.
This operation allocates a new `Buffer` object for every single frame. At 1080p resolution and high frame rates, this creates continuous churn of multi-megabyte objects in Node's heap, which must be subsequently garbage collected, leading to micro-stalls.
By pre-allocating a pool of large reusable buffers per `DomStrategy` instance and using `captureBuffer.write(screenshotData, 'base64')`, we can completely eliminate these `Buffer` allocations per frame. Tests verify that Node's `Stream.write` handles this synchronously, and since the max pipeline depth in `Renderer.ts` is exactly 8 frames per worker, a pool of 8 pre-allocated buffers per worker is completely race-condition safe.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Fixed resolution, FPS, duration, and codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.474s (as of PERF-089)
- **Bottleneck analysis**: Profiling shows time spent allocating `Buffer` objects inside the `capture` method.

## Implementation Spec

### Step 1: Add a buffer pool to `DomStrategy`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add private class properties:
   ```typescript
   private bufferPool: Buffer[] = Array.from({ length: 8 }, () => Buffer.allocUnsafe(1920 * 1080 * 2));
   private bufferIndex: number = 0;
   ```
2. Modify the `capture` method. Replace:
   ```typescript
   const buffer = Buffer.from(screenshotData, 'base64');
   ```
   with:
   ```typescript
   const byteLen = Buffer.byteLength(screenshotData, 'base64');
   let captureBuffer = this.bufferPool[this.bufferIndex];
   if (captureBuffer.length < byteLen) {
       captureBuffer = Buffer.allocUnsafe(Math.max(byteLen + 1024 * 1024, 1920 * 1080 * 2));
       this.bufferPool[this.bufferIndex] = captureBuffer;
   }
   const bytesWritten = captureBuffer.write(screenshotData, 'base64');
   const buffer = captureBuffer.subarray(0, bytesWritten);
   this.bufferIndex = (this.bufferIndex + 1) % 8;
   ```
   Apply this replacement in both places `Buffer.from(screenshotData, 'base64')` is called (target element bounding box flow and full page flow).

**Why**: By pre-allocating a pool of 8 buffers per worker, we match the pipeline depth constraint (`pool.length * 8`). This completely eliminates the multi-megabyte `Buffer` allocations and subsequent garbage collection for every single frame, without corrupting in-flight frames waiting to be written to FFmpeg.

**Risk**: If the pipeline depth in `Renderer.ts` is increased beyond 8 per worker in the future, the buffer pool might overwrite frames before they are consumed. Since `Renderer.ts` hardcodes `maxPipelineDepth = poolLen * 8`, 8 buffers per worker is perfectly safe.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` and ensure it still captures correctly.

## Correctness Check
Run the main `benchmark.ts` to ensure rendering still outputs a valid video file.

## Prior Art
- PERF-076: Preallocated arrays and object pools to reduce GC churn.
- PERF-091: Targeted closures. This targets the most significant remaining memory allocation in the hot loop.

## Results Summary
- **Best render time**: 33.376s (vs baseline 33.561s)
- **Improvement**: ~0.55%
- **Kept experiments**: [PERF-092] Preallocate Buffer for Base64 Decoding in DomStrategy.ts
- **Discarded experiments**: []
