---
id: PERF-628
slug: eliminate-frame-ready-ring
status: complete
claimed_by: "executor-session"
created: 2024-06-01
completed: "2024-06-01"
result: "failed"
---

# PERF-628: Eliminate `frameReadyRing` in CaptureLoop

## Focus Area
The V8 hot loop array allocations and index accesses inside the `CaptureLoop.ts` writer/worker pipeline. This targets the primary DOM capture pipeline bottleneck by reducing synchronous operations.

## Background Research
Currently, `CaptureLoop.ts` synchronizes the workers and the FFmpeg writer loop using two arrays: `frameBufferRing` (a generic Array holding `Buffer | string | null`) and `frameReadyRing` (a `Uint8Array` storing `1` when ready and `0` when not). Because the worker promises resolve sequentially or asynchronously and write to `frameBufferRing[ringIndex]`, setting `frameBufferRing[ringIndex] = buffer` natively implies the frame is ready, provided `buffer` cannot be `null`. Since `capture()` in `DomStrategy` strictly returns `Buffer` or `string` (defaulting to the non-null `emptyImageBase64` on failure), a `null` value in `frameBufferRing` is an unambiguous indicator that a frame is incomplete. Eliminating the `frameReadyRing` completely removes one TypedArray allocation and avoids two index read/writes per frame loop, which slightly unburdens V8's inline cache mapping in the critical loop path.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/output/example-build/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames), ultrafast x264 preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.274s (latest trace)
- **Bottleneck analysis**: The `runWorker` multi-worker array allocation overhead inside V8 event loop blocks context switching and delays CDP.

## Implementation Spec

### Step 1: Remove `frameReadyRing` Allocation and Assignments
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `const frameReadyRing = new Uint8Array(maxPipelineDepth);`.
2. In the `checkState()` function, remove `frameReadyRing[ringIndex] = 0;`.
3. In the `runWorker()` function's assignment block, remove `frameReadyRing[ringIndex] = 0;`.
4. In the `runWorker()` function's fulfillment block, remove both instances of `frameReadyRing[ringIndex] = 1;`.
**Why**: Eliminates the secondary array tracking entirely.
**Risk**: None. The buffer ring itself stores the data natively and implicitly tracks readiness.

### Step 2: Use `frameBufferRing` for Readiness Checks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. In the writer loop, change the readiness check from `if (frameReadyRing[ringIndex] === 0)` to `if (frameBufferRing[ringIndex] === null)`.
2. Retain `const buffer = frameBufferRing[ringIndex]!;`.
**Why**: Replaces the explicit flag tracking with a null-check on the buffer array, achieving identical synchronization with less memory operations.
**Risk**: None, `null` is explicitly assigned at the start of a frame slot allocation.

## Correctness Check
- Verify the pipeline completes without stalling (no infinite writer waits).
- Run `npx tsx packages/renderer/scripts/benchmark-perf.ts` to confirm rendering outputs the expected frame count.

## Results Summary
- **Best render time**: 2.874s (vs baseline 1.317s)
- **Improvement**: Regressed
- **Kept experiments**: None
- **Discarded experiments**: PERF-628
