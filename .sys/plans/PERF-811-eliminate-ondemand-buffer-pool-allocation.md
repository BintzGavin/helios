---
id: PERF-811
slug: eliminate-ondemand-buffer-pool-allocation
status: unclaimed
claimed_by: ""
created: 2024-06-21
completed: ""
result: ""
---

# PERF-811: Eliminate On-Demand Buffer Pool Allocation in CaptureLoop

## Focus Area
`CaptureLoop.ts` fast paths (single worker loop), specifically the Base64 decode buffer pool allocation logic.

## Background Research
In PERF-809, a `freePool` of `Buffer` instances was introduced to recycle buffers and avoid per-frame GC allocations during Base64 decoding, while preventing backpressure corruption. However, currently `freePool` starts empty (`const freePool: Buffer[] = [];`), and the loop dynamically allocates new `Buffer` objects using `Buffer.allocUnsafe()` on demand when `freePool.pop()` returns undefined.

In the fast path, avoiding *any* `Buffer.allocUnsafe()` call within the `hasProcessFn` loop is desirable to keep the hot path fully monomorphic and free of C++ allocation stalls. By fully pre-populating the `freePool` with `POOL_SIZE` buffers of an estimated or known initial capacity before the loop begins, we can eliminate the dynamic allocation branch entirely for the vast majority of frames (unless the frame size unexpectedly grows).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s (baseline from earlier fast-path optimizations)
- **Bottleneck analysis**: Calling `Buffer.allocUnsafe()` during the first ~64 frames creates C++ allocation stalls that interrupt the otherwise smooth hot loop.

## Implementation Spec

### Step 1: Pre-populate the `freePool`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Currently around line 157, `const freePool: Buffer[] = [];` is initialized as an empty array.
Modify it to pre-allocate buffers based on the estimated frame size:

```typescript
        // A standard 1080p frame is ~300KB to 2MB in base64. A 600x600 canvas frame base64 decode needs ~200KB.
        // We pre-allocate with a conservative 512KB to cover most initial frame dimensions without realloc.
        const POOL_SIZE = 64;
        const INITIAL_BUFFER_SIZE = 512 * 1024;
        const freePool: Buffer[] = new Array(POOL_SIZE);
        for (let i = 0; i < POOL_SIZE; i++) {
            freePool[i] = Buffer.allocUnsafe(INITIAL_BUFFER_SIZE);
        }
```

**Why**: This strictly moves 64 buffer allocations out of the hot path to the initialization phase. The hot loop will simply `pop()` a pre-allocated buffer of sufficient size (512KB is enough for 600x600 test frames and 720p). If a user renders 4K, the existing `if (!buf || buf.length < maxBytes)` logic will correctly expand the buffer exponentially, so safety is maintained.

## Variations
N/A

## Canvas Smoke Test
Run the `canvas` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode canvas`) to verify `canvas` mode still correctly captures the expected number of frames and finishes without hanging.

## Correctness Check
Run the `dom` mode benchmark script (`npx tsx scripts/benchmark-perf.ts --mode dom`). Ensure progress reporting is still emitted sequentially and the render completes successfully.

## Prior Art
- PERF-809 (Base64 Decode Buffer Pool) introduced the pool but left it initially empty.
