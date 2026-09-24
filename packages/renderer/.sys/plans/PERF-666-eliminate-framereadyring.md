---
id: PERF-666
slug: eliminate-framereadyring
status: complete
claimed_by: "Jules"
created: 2024-06-04
completed: "2026-06-04"
result: "discarded"
---
# PERF-666: Eliminate frameReadyRing in CaptureLoop

## Focus Area
The Frame Capture Loop, specifically the multi-worker synchronization and buffer queueing logic in `CaptureLoop.ts`. This targets CPU overhead during frame availability checks.

## Background Research
`CaptureLoop.ts` uses two parallel arrays for buffering frames: `frameBufferRing` (holds the actual buffer) and `frameReadyRing` (a Uint8Array tracking if the slot is ready). In a tightly coupled loop, maintaining two synchronized arrays introduces redundant array accesses, bounds checking, and cache line pressure. By utilizing a sentinel value in `frameBufferRing` (e.g., `null`), we can eliminate `frameReadyRing` entirely. V8 is highly optimized for checking `if (val === null)` versus looking up a secondary index `if (arr[idx] === 0)`.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s (from PERF-662)
- **Bottleneck analysis**: The worker generator and main loop repeatedly read and write to both `frameBufferRing` and `frameReadyRing`. Eliminating one reduces V8 bytecode execution and memory lookups.

## Implementation Spec

### Step 1: Remove frameReadyRing initialization
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Remove the line `const frameReadyRing = new Uint8Array(maxPipelineDepth); // 0 = not ready, 1 = ready`.
**Why**: We will use `frameBufferRing` to track readiness. `null` means empty/not ready.
**Risk**: None, as long as all reads/writes are updated.

### Step 2: Update slot clearing in checkState and runWorker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: In both `checkState` and `runWorker`, remove the assignment `frameReadyRing[ringIndex] = 0;`. Ensure `frameBufferRing[ringIndex] = null;` is present.
**Why**: `null` now signals that the slot is available/not ready.
**Risk**: Low, standard nullification.

### Step 3: Update frame completion in runWorker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Inside the `try` block of `runWorker`, remove `frameReadyRing[ringIndex] = 1;`. The line `frameBufferRing[ringIndex] = buffer;` inherently marks it as ready.
**Why**: A non-null value signifies readiness.
**Risk**: `buffer` might be falsy, but in this context, it's either a `Buffer` or `string`. If a frame capture returns falsy unexpectedly, the pipeline might stall. (But this is already an error condition).

### Step 4: Update readiness check in main write loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Change the condition `if (frameReadyRing[ringIndex] === 0)` to `if (frameBufferRing[ringIndex] === null)`. Then, remove `const buffer = frameBufferRing[ringIndex]!;` since you just checked it, though you might still need to extract it to a `buffer` variable for typing, e.g. `const buffer = frameBufferRing[ringIndex]; if (buffer === null) { await... continue; }`.
**Why**: Directly checks the primary array for readiness, bypassing a secondary array lookup.
**Risk**: Low.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark to ensure no regressions in canvas rendering mode.

## Correctness Check
Verify output video opens and contains 150 frames.

## Prior Art
PERF-622 successfully eliminated `frameErrorRing`, showing that consolidating parallel tracking arrays in the hot loop yields measurable performance improvements in V8.


## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|---|---|---|---|---|---|---|
| 1 | 2.904 | 150 | 51.65 | 62.8 | discard | eliminate frameReadyRing |
| 2 | 2.814 | 150 | 53.30 | 63.0 | discard | eliminate frameReadyRing |
| 3 | 2.830 | 150 | 53.00 | 62.8 | discard | eliminate frameReadyRing |

**Outcome:** Discarded. Using parallel fixed-type Uint8Arrays for state tracking is faster in V8 than checking for null/object references in a mixed-type array.
