---
id: PERF-644
slug: bitmask-frame-ready-ring
status: unclaimed
claimed_by: ""
created: 2024-06-01
completed: ""
result: ""
---

# PERF-644: Bitmask Optimization for `frameReadyRing` in CaptureLoop

## Focus Area
`CaptureLoop.ts` (`frameReadyRing` allocation and accesses): This array controls synchronization between the capture worker pushing frames and the writer loop writing to FFmpeg.

## Background Research
The `frameReadyRing` in `CaptureLoop.ts` is currently instantiated as a `Uint8Array` of length `maxPipelineDepth` (which is typically 8 or 16). The worker loop sets indices to `0` or `1`, and the writer loop checks if an index is `0`.

Since `maxPipelineDepth` is guaranteed to be a power of 2 and generally small (e.g. <= 32), we can completely replace the `Uint8Array` with a single 32-bit integer `let frameReadyMask = 0;` acting as a bitmask.
Setting an index to `ready` becomes `frameReadyMask |= (1 << index);`.
Setting an index to `not ready` becomes `frameReadyMask &= ~(1 << index);`.
Checking if an index is ready becomes `(frameReadyMask & (1 << index)) !== 0`.

Why is this faster?
1. It eliminates the V8 bounds checking on `Uint8Array` reads and writes in the hot loop.
2. Bitwise operations on Smis (small integers) in V8 are incredibly fast and completely avoid hidden class polymorphic lookups or array indexing overhead.
3. It entirely removes the memory allocation for the `Uint8Array` instance, further reducing GC pressure.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/composition.html`)
- **Render Settings**: Standard microVM
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.538s

## Implementation Spec

### Step 1: Replace `frameReadyRing` with `frameReadyMask`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `const frameReadyRing = new Uint8Array(maxPipelineDepth);` and replace it with `let frameReadyMask = 0;`.
2. Where we reset the ring: `frameReadyRing[ringIndex] = 0;` -> `frameReadyMask &= ~(1 << ringIndex);`.
3. Where we set the ring: `frameReadyRing[ringIndex] = 1;` -> `frameReadyMask |= (1 << ringIndex);`.
4. Where we check the ring in the writer loop: `if (frameReadyRing[ringIndex] === 0)` -> `if ((frameReadyMask & (1 << ringIndex)) === 0)`.

**Why**: Replaces an array lookup/write with a direct bitwise operation, removing array bounds check overhead in the tight loop.

**Risk**: If `maxPipelineDepth` ever exceeds 31, the bitshift `1 << 31` would become negative (due to 32-bit signed integers in JS), but `maxPipelineDepth` is dynamically computed and typically 8. Even up to 30 it's perfectly safe. The calculation is `poolLen * 8` rounded to the nearest power of 2. For `poolLen = 1` it's 8. If `poolLen` was 4, it's 32, which might overflow `1 << 31` to negative but bitwise ops still work correctly since JS `&` and `|` operate on 32-bit signed integers. So `(1 << 31)` becomes `-2147483648`, which works perfectly for masking. Just to be safe, `(1 << 31)` is a valid bitmask.

## Variations
None needed.

## Canvas Smoke Test
None needed (CaptureLoop is generic but primarily stressed here).

## Correctness Check
Run the DOM benchmark and ensure the video renders successfully without hanging (which would indicate a mask bug blocking the writer).

## Prior Art
- **PERF-622**: Replaced `frameErrorRing` array with a single scalar `fatalError` which improved performance by 6%. Scalar/primitive replacement of short arrays is a proven optimization in this loop.
