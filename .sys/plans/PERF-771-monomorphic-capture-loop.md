---
id: PERF-771
slug: monomorphic-capture-loop
status: unclaimed
claimed_by: ""
created: 2024-06-18
completed: ""
result: ""
---

# PERF-771: Monomorphic Capture Loop via Complete Branch Unrolling

## Focus Area
The Frame Capture Loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, completely unrolling the `hasProcessFn` ternary/if-else branch in the fast path (single worker) and multi-worker loops.

## Background Research
The `RENDERER-EXPERIMENTS.md` lists an Open Question regarding the Monomorphic Capture Loop (PERF-771): "Will completely unrolling the ternary branch (`hasProcessFn ? ... : ...`) to duplicate the `for` and `while` loops inside `CaptureLoop.ts` improve the hot path speed by making it fully monomorphic?".

V8 relies on monomorphic inline caches to optimize loops heavily. When logic inside hot loops branches or the same loop contains conditionally different asynchronous paths, V8's TurboFan compiler might generate polymorphic code or bail out of specific optimizations. By completely duplicating the `for` and `while` loop logic inside the `hasProcessFn` condition blocks and leaving the loops strictly monomorphic, we eliminate branch prediction penalties and ensure TurboFan can optimize each distinct loop to its maximum potential.

A previous experiment (PERF-774) attempted loop peeling by moving the `hasProcessFn` check to the outside, but it regressed render time, potentially due to the specific implementation causing larger bytecode size or disrupting TurboFan optimizations. This experiment will serve as a follow-up to definitively test fully unrolled loops.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: default settings in `scripts/benchmark-perf.ts`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 3.009s
- **Bottleneck analysis**: Micro-branching per-frame (like `hasProcessFn ? ... : ...` inside the loop) introduces JIT polymorphism and instruction caching overhead.

## Implementation Spec

### Step 1: Unroll single-worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Check the `for` loop in the single-worker path. Ensure that `hasProcessFn` is evaluated exactly once *outside* the `for` loop. If there is a `hasProcessFn ? ... : ...` ternary inside the loop, remove it. Duplicate the entire `for` loop: one version where `strategy.processCaptureResult` is called, and another `else` version where it is not.
**Why**: V8's TurboFan compiler can optimize monomorphic loops much better than polymorphic ones. By completely duplicating the `for` loop inside the `if (hasProcessFn)` condition blocks, we eliminate branch prediction penalties inside the hot loop.
**Risk**: Larger bytecode size might reduce CPU instruction cache locality.

### Step 2: Unroll multi-worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the identical loop peeling to the multi-worker path (`while (!aborted)`). Evaluate `if (hasProcessFn)` once outside the loop, and duplicate the `while` loop block.
**Why**: Same reasoning as single-worker. Ensuring no per-iteration `hasProcessFn` checks occur.
**Risk**: Same as above.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --runs 1` (default canvas mode) to verify that basic capture still works.

## Correctness Check
Run the DOM verification script `npx tsx tests/verify-dom-render.ts` to ensure the generated frames have correct content.

## Prior Art
- PERF-774 attempted this approach.
