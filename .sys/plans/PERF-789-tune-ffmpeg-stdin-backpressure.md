---
id: PERF-789
slug: tune-ffmpeg-stdin-backpressure
status: complete
claimed_by: "jules"
created: 2024-06-17
completed: ""
result: ""
---

# PERF-789: Tune FFmpeg Stdin Backpressure Limit in CaptureLoop

## Focus Area
Frame Capture Loop (`CaptureLoop.ts`). This targets the memory buffering limits before the fast path blocks on FFmpeg's `drain` event.

## Background Research
In the single-worker hot loop, we write PNG buffers to FFmpeg's `stdin`. When `stdin.write()` returns `false` (indicating backpressure), we currently check if `stdin.writableLength >= 16777216` (16MB) before awaiting `drainPromise`.
In PERF-781, removing this await entirely (allowing infinite memory buffering) caused a significant regression (~2.96s vs ~2.06s). This proved that holding too many frame buffers in memory simultaneously forces V8 to perform expensive garbage collection and disrupts hot loop optimization.
However, 16MB might still be too large, leading to bursty GC pauses. By lowering the threshold to 4MB (`4194304`), we enforce tighter synchronization between the Node.js capture loop and the FFmpeg encoder. This keeps the active memory footprint smaller, potentially allowing all active buffers to fit within the CPU's L3 cache, reducing main memory bandwidth pressure, and smoothing out GC cycles.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom` (with `maxWorkers: 1` implicitly via fast path)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Occasional large GC pauses during the CaptureLoop due to a high backpressure limit (16MB). Tuning this limit can optimize the pipeline flow between Chromium IPC, Node memory, and FFmpeg encoding.

## Implementation Spec

### Step 1: Lower writableLength threshold in single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `hasProcessFn` path (around line 176):
Replace:
```typescript
if (!canWriteMore && stdin.writableLength >= 16777216) {
```
With:
```typescript
if (!canWriteMore && stdin.writableLength >= 4194304) {
```

### Step 2: Lower writableLength threshold in single-worker non-processFn path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `else` path (around line 202):
Replace:
```typescript
if (!canWriteMore && stdin.writableLength >= 16777216) {
```
With:
```typescript
if (!canWriteMore && stdin.writableLength >= 4194304) {
```

**Why**: Reducing the buffer limit from 16MB to 4MB forces the loop to yield to FFmpeg more frequently but with smaller payloads, maintaining a tighter, more cache-friendly memory footprint and preventing large GC spikes.

## Variations
- **Variation A**: If 4MB regressions, try 8MB (`8388608`).

## Canvas Smoke Test
Run a basic canvas composition to ensure rendering completes successfully without deadlocks.

## Correctness Check
- The output MP4 should render correctly and log progress without hanging.

## Prior Art
- PERF-781 (infinite buffering regressed performance)
- PERF-689 (introduced the 16MB limit)

## Results Summary
- **Best render time**: 2.257s
- **Improvement**: Regression
- **Kept experiments**: None
- **Discarded experiments**: 4MB writableLength threshold
