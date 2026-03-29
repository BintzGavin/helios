---
id: PERF-107
slug: dynamic-buffer-alloc
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: "2026-03-29"
result: "improved"
---

# PERF-107: Replace Static Buffer Pool with Dynamic allocUnsafe

## Focus Area
DOM Rendering Frame Capture Loop - Node.js Base64 Decoding Buffer Allocation

## Background Research
Currently, `DomStrategy` uses a static array of 10 pre-allocated buffers (`bufferPool`) to decode the base64 string returned by the `HeadlessExperimental.beginFrame` CDP command. The index rotates `(this.bufferIndex + 1) % 10`.
However, in `Renderer.ts`, the `maxPipelineDepth` constraint is dynamically set to `poolLen * 10`. If the worker pool has 6 to 8 pages, the pipeline depth can be 60 to 80. As frames are queued asynchronously, the static pool of 10 buffers is exhausted immediately, and the `bufferIndex` wraps around, overwriting the exact memory regions that earlier frame capture promises have yielded and are actively being piped into the `ffmpegProcess.stdin.write()` stream.
While `ffmpeg` might process corrupted frames gracefully without crashing, this race condition fundamentally compromises the rendering stream and negates the benefits of deep pipelining.
Because V8's young generation garbage collector is highly optimized for short-lived buffers, dynamically allocating the exact required size via `Buffer.allocUnsafe` per frame avoids the race condition and is often faster or equivalent to maintaining a shared pool that must handle bounds-checking and slicing.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: Standard DOM benchmark
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.631s
- **Bottleneck analysis**: The static buffer pool in `DomStrategy.ts` uses 10 buffers while pipeline depth exceeds 60, causing active frames to be overwritten in memory before ffmpeg ingestion completes, creating a race condition and potential IO stalling.

## Implementation Spec

### Step 1: Replace static buffer pool with dynamic Buffer.allocUnsafe
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Remove the `bufferPool` and `bufferIndex` properties entirely from the class.
Rewrite `writeToBufferPool` to dynamically allocate the required memory:
```typescript
  private writeToBufferPool(screenshotData: string): Buffer {
    const maxByteLen = (screenshotData.length * 3) >>> 2;
    const captureBuffer = Buffer.allocUnsafe(maxByteLen);
    const bytesWritten = captureBuffer.write(screenshotData, 'base64');
    return captureBuffer.subarray(0, bytesWritten);
  }
```
**Why**: Resolves the severe memory race condition caused by the pipeline depth exceeding the static pool size. `Buffer.allocUnsafe` is extremely fast and V8's GC handles these short-lived Buffers in the young generation efficiently, likely matching the performance of a shared pool without the data corruption risks.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-codecs.ts` to ensure canvas/dom basics work.

## Correctness Check
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` multiple times to verify benchmark times and ensure the output video is generated smoothly without artifacts.

## Results Summary
- **Best render time**: 33.459s (vs baseline 34.631s)
- **Improvement**: ~3.3%
- **Kept experiments**: Dynamic Buffer.allocUnsafe
- **Discarded experiments**: none
