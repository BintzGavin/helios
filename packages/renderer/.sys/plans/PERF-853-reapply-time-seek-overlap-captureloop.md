---
id: PERF-853
slug: reapply-time-seek-overlap-captureloop
status: unclaimed
claimed_by: ""
created: 2024-06-25
completed: ""
result: ""
---

# PERF-853: Reapply Time Seek Overlap with CPU Processing in CaptureLoop Fast Paths

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` single-worker fast paths (lines ~260-800).

## Background Research
According to our journal, PERF-830 previously demonstrated that overlapping the network-bound `timeDriver.setTime()` CDP promise with CPU-bound Base64 decoding yields a significant performance improvement (~15% to 58% depending on the benchmark).

However, following recent refactors (like PERF-824 which inlined `DomStrategy` capture logic directly into `CaptureLoop.ts`), this overlap was inadvertently lost. The current code in the single-worker fast paths sequentially awaits `timePromise` immediately after invoking it, forcing the thread to idly wait for the CDP response before beginning the heavy, synchronous CPU work of Base64 decoding and Buffer writing.

By deferring the `await timePromise` until *after* the synchronous Base64 allocation and decoding is complete, we allow the Node.js event loop to process the CDP request concurrently while V8 occupies the CPU thread doing string-to-buffer decoding.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The thread is blocking on network I/O (CDP `setTime` round-trip) when it could be concurrently utilizing the CPU for string decoding.

## Implementation Spec

### Step 1: Defer `await timePromise` in Single-Worker Fast Paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker loop fast paths (inside the `if (i < totalFrames - 1)` blocks), locate the `timePromise` invocation.
Move `if (timePromise) await timePromise;` and the subsequent `nextCapturePromise` assignment to *after* the `stream.write(...)` execution, but *before* the `drainPromise` check.

Example Target:
```typescript
const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);

let buf;
// ... decode base64 ...
const writeSuccessStr = stream.write(chunk, pooled.freeCb);

if (timePromise) await timePromise;
nextCapturePromise = domBeginFrame!();

if (!writeSuccessStr && pendingBytes >= 16777216) {
```
Apply this transformation to all 8 fast-path variations within the single-worker `if (poolLen === 1)` block.

## Variations
None.

## Correctness Check
Run the `dom` mode benchmark script to verify that frame capturing correctly handles the overlapped timing without throwing errors.
