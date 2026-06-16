---
id: PERF-784
slug: remove-drain-promise-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-06-16
completed: ""
result: ""
---

# PERF-784: Remove Drain Promise Await in Multi-Worker Loop

## Focus Area
Frame Capture Loop (`CaptureLoop.ts`). This targets the synchronization bottleneck between the frame writing process and FFmpeg's stream consumption on the multi-worker path.

## Background Research
In PERF-781, we tried removing the `await this.drainPromise` on the single-worker fast path. While that experiment failed (regressing render time to ~2.96s), it was mainly because holding unbounded frames in memory during the deeply optimized monomorphic loop caused memory pressure and disrupted V8's optimization.
However, in the **multi-worker** path, workers and the main thread writing loop operate in a pipeline. The multi-worker path processes frames asynchronously and writes them out when they are ready. If we remove the `await this.drainPromise` in the multi-worker path (specifically the block `if (!canWriteMore && stdin.writableLength >= 16777216) { await this.drainPromise; }`), we can prevent the writer thread from stalling. The worker threads are already bounded by `maxPipelineDepth` (acting as backpressure), so removing the FFmpeg stdin drain wait will decouple the write loop from FFmpeg entirely, allowing Chromium parallel capture to continue uninterrupted up to the pipeline limit.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom` (with multi-worker enabled)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The multi-worker loop synchronizes heavily on writing frames in order. Awaiting the `drainPromise` blocks the main coordination loop from checking workers or dispatching the next tasks, reducing concurrency.

## Implementation Spec

### Step 1: Remove backpressure await in multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker pipeline coordination `while` loop:
```typescript
            if (stdin?.writable) {
                    const canWriteMore = stdin.write(buffer as any);

                    if (!canWriteMore && stdin.writableLength >= 16777216) {
                    await this.drainPromise;
                }
            } else {
```

Remove the `await this.drainPromise` block:
```typescript
            if (stdin?.writable) {
                    stdin.write(buffer as any);
            } else {
```
**Why**: Decouples the main thread from FFmpeg's read speed. The workers are already restricted by `maxPipelineDepth`, which prevents true infinite memory buffering (OOM), providing a built-in safety net that wasn't present in the single-worker path.

## Variations
N/A

## Correctness Check
Verify that the output MP4 compiles successfully without truncation.

## Prior Art
- PERF-781 (Failed on single-worker due to infinite buffering disrupting optimization, but multi-worker has built-in bounds via `maxPipelineDepth`).
