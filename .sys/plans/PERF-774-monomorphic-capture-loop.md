---
id: PERF-774
slug: monomorphic-capture-loop
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "$(date +%Y-%m-%d)"
result: "discard"
---

# PERF-774: Monomorphic Capture Loop

## Focus Area
The frame capture loop in `packages/renderer/src/core/CaptureLoop.ts` contains a polymorphic ternary operation on every frame evaluation (`hasProcessFn ? strategy.processCaptureResult!(await strategy.capture(page, time)) : await strategy.capture(page, time)`). By unrolling this branch entirely, we can provide V8 with a fully monomorphic hot path, minimizing closure and context switching overhead in the innermost loops.

## Background Research
Previous experiments (PERF-762, PERF-758, PERF-745) explored various ways to optimize the closure execution of `processCaptureResult`. While replacing the dynamic lookup with a boolean variable (`hasProcessFn`) improved performance slightly, the inline ternary still causes V8's TurboFan compiler to generate polymorphic byte-code and branch logic inside the hot loop. By fully peeling the loop (ie. splitting the `for` and `while` loop logic based on `hasProcessFn` prior to entering them), we ensure monomorphic execution.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/dom-benchmark`
- **Render Settings**: 600x600, 60fps, 5s (300 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s
- **Bottleneck analysis**: The ternary evaluation (`hasProcessFn ? ... : ...`) is executed heavily per worker pipeline on the hot path in `packages/renderer/src/core/CaptureLoop.ts`.

## Implementation Spec

### Step 1: Fully unroll the single-worker hot loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the single worker fast path block (`if (poolLen === 1)`), hoist the `hasProcessFn` check completely *outside* the `try { for (let i = 0; i < totalFrames; i++) { ... } }` loop.
Duplicate the `for` loop body entirely.
- Block 1 (`if (hasProcessFn)`): `try { for (let i = 0; i < totalFrames; i++) { ... const buffer = strategy.processCaptureResult!(await strategy.capture(page, time)); ... } }`
- Block 2 (`else`): `try { for (let i = 0; i < totalFrames; i++) { ... const buffer = await strategy.capture(page, time); ... } }`
**Why**: Allows the V8 compiler to treat the entire loop contents as fully monomorphic without inline conditional evaluation.
**Risk**: Increased code duplication and visual clutter.

### Step 2: Fully unroll the multi-worker hot loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the multi-worker function (`const runWorker = async (worker: WorkerInfo, workerIndex: number) => {`), apply the exact same loop peeling.
Hoist the `if (hasProcessFn)` check outside of the `while (!aborted)` loop, duplicating the `while` block in its entirety.
- Block 1 (`if (hasProcessFn)`): `while (!aborted) { ... const buffer = strategy.processCaptureResult!(await strategy.capture(page, time)); ... }`
- Block 2 (`else`): `while (!aborted) { ... const buffer = await strategy.capture(page, time); ... }`
**Why**: Identical reasons as the single worker fast path; avoids polymorphic loop behavior in the concurrent renderer.
**Risk**: Same as above, code duplication.

## Variations
N/A

## Canvas Smoke Test
Run a canvas render (e.g. `npx tsx scripts/benchmark-perf.ts --mode canvas`) to verify no syntax errors break the core loop logic.

## Correctness Check
Run the standard DOM benchmark and ensure the output video is generated without visual issues or truncated duration.

## Prior Art
PERF-762 (Re-applied inline boolean check), PERF-767 (Inlined capture ternary and peeled sync media loop).

## Results Summary
- **Best render time**: ~2.312s (baseline ~2.069s)
- **Improvement**: none (regressed)
- **Discarded experiments**: Monomorphic capture loop via loop peeling did not improve performance. The larger bytecode from duplicating the loop bodies likely countered any minor gains from avoiding the single boolean evaluation per frame, which V8 inline caching already handles efficiently.
