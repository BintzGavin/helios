---
id: PERF-1122
slug: preallocate-buffer-slicing
status: unclaimed
claimed_by: ""
created: 2026-10-22
completed: ""
result: ""
---

# PERF-1122: Replace Buffer allocation with pre-allocated buffer slicing in CaptureLoop.ts

## Focus Area
`CaptureLoop.ts` (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Currently, every time we capture a frame in the DOM strategy, the raw CDP result (base64 string) is converted into a buffer using `Buffer.from(rawResult as string, "base64")`. This results in the V8 engine allocating a new `Buffer` object (and underlying memory) for each frame. This object creation introduces per-frame overhead and puts pressure on the Garbage Collector (GC), especially at high framerates (60fps) over long compositions.

Instead of allocating a new buffer per frame, we can create a single, large, reusable `Buffer` outside the loop, and use `buffer.write(rawResult as string, 0, "base64")` to write the string data directly into the pre-allocated memory space. The `.write()` method returns the number of bytes written, which we can then use to slice a view over the written portion: `buffer.subarray(0, bytesWritten)`. This avoids allocating new memory and returning new objects per frame, relying purely on slicing which is extremely cheap in Node.js. Note that `buffer.write` overwrites data in-place, so we don't have to clear the buffer manually, saving further overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: By inspecting `CaptureLoop.ts`, we see `Buffer.from(..., "base64")` is called inside every inner single worker and multi worker tight loop. Removing the memory allocation penalty will test if object instantiation is a primary bottleneck.

## Implementation Spec

### Step 1: Pre-allocate reusable buffer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Add a pre-allocated reusable buffer outside the main loops (around line 160). Since 1080p frame buffers will generally not exceed a few megabytes in base64 size (even when uncompressed), a 10MB buffer will be sufficient for our needs without constant resizing.
```typescript
const reusableBuffer = Buffer.allocUnsafe(10 * 1024 * 1024); // 10MB pre-allocated
```

### Step 2: Update single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace all occurrences of:
```typescript
const buf = Buffer.from(rawResult as string, "base64");
```
with:
```typescript
const bytesWritten = reusableBuffer.write(rawResult as string, 0, "base64");
const buf = reusableBuffer.subarray(0, bytesWritten);
```

### Step 3: Update multi-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace all occurrences of:
```typescript
let buf: Buffer = Buffer.from(rawResult as string, "base64");
```
with:
```typescript
const bytesWritten = reusableBuffer.write(rawResult as string, 0, "base64");
let buf: Buffer = reusableBuffer.subarray(0, bytesWritten);
```

## Caveats and Risks
- Node streams internally maintain references to passed buffers until the write completes and memory is drained. If we reuse the same physical memory space across rapid frames, and a stream `.write(buf)` operation holds onto that memory segment asynchronously, the next iteration's `buffer.write` will overwrite the memory *before* the stream finishes pushing the previous frame to the OS pipe. This could lead to tearing, interleaved bits, or corrupted video frames if the stream buffers it.
- **Alternative Risk Assessment**: The experiment may prove that user-space memory pooling is unsafe to use directly with `child_process.stdin.write` if `stream.write()` caches the pointer instead of the actual data during backpressure.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure canvas functionality is intact.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode=dom` inside `packages/renderer`.
**CRITICAL**: Verify the output `dom-benchmark.mp4` using `ffprobe` and visually confirm there is no frame corruption or tearing. If the video is corrupt, the experiment is a failure because `stream.write` does not copy the memory synchronously before we overwrite it.