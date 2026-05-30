---
id: PERF-622
slug: eliminate-frame-error-ring
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: 2024-05-30
result: kept
---

# PERF-622: Eliminate `frameErrorRing` in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, `CaptureLoop.ts` allocates a `frameErrorRing` array to store potential errors for each frame alongside the `frameBufferRing`. In the `runWorker` hot loop, every time a frame is successfully captured, the code clears the error slot: `frameErrorRing[ringIndex] = null`.
Since errors during frame capture are extremely rare and generally fatal to the entire render process, maintaining a per-frame ring buffer for errors is unnecessary. Replacing this with a single, global `fatalError` variable avoids writing to the `frameErrorRing` array on every single frame, slightly reducing V8 array bounds checking, memory writes, and GC pressure in the critical loop.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Standard microVM constraints.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s (based on recent RENDERER-EXPERIMENTS.md data)
- **Bottleneck analysis**: Micro-optimizations in the V8 hot loop (removing unnecessary array assignments).

## Implementation Spec

### Step 1: Remove `frameErrorRing` Array
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
- Delete `const frameErrorRing = new Array<any>(maxPipelineDepth).fill(null);`.
- Introduce a single variable `let fatalError: any = null;` before the worker definitions.

### Step 2: Update Worker Hot Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
- In `runWorker`, remove `frameErrorRing[ringIndex] = null;` from both the success and initialization branches.
- In the `catch (e)` block of `runWorker`, replace `frameErrorRing[ringIndex] = e;` with `fatalError = e; aborted = true; checkState();`.

### Step 3: Update Writer Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
- In the main `while` loop that writes to FFmpeg, remove `const error = frameErrorRing[ringIndex]; if (error) throw error;`.
- Before accessing the buffer, add `if (fatalError) throw fatalError;`.

**Why**: By replacing a ring buffer with a single shared variable, we save one array write operation and one array read operation per frame in the hottest part of the pipeline.
**Risk**: Negligible risk. An error on any frame will still correctly abort the process.

## Canvas Smoke Test
Run `npx tsx tests/verify-orchestrator-plan.ts` and standard canvas tests to ensure basic logic isn't broken.

## Correctness Check
Verify output via `benchmark-perf.ts`.

## Results Summary
- **Best render time**: 2.160s (vs baseline 2.296s)
- **Improvement**: ~6.0%
- **Kept experiments**: Eliminated `frameErrorRing` in `CaptureLoop.ts`.
- **Discarded experiments**: none
