---
id: PERF-995
slug: unroll-is-dom-strategy-checks-in-single-worker-no-process-fn
status: unclaimed
claimed_by: ""
created: 2026-07-13
completed: ""
result: ""
---

# PERF-995: Unroll `isDomStrategy` checks in single-worker initial frame processing (`!hasProcessFn` path)

## Focus Area
The single-worker fast path initialization logic in `packages/renderer/src/core/CaptureLoop.ts` (around lines 410-480) for the `!hasProcessFn` branch, where `isDomStrategy` branches repeatedly.

## Background Research
When a single worker renders the composition, the loop primes the 0th and 1st frames before entering a fast while-loop that iterates the remainder. During this initialization, the `isDomStrategy` boolean is checked sequentially inside multiple `if` blocks in the `!hasProcessFn` path.

Evaluating `isDomStrategy` multiple times sequentially creates redundant parsing and branching instructions in V8's hot path AST.

We can optimize this by hoisting the `isDomStrategy` check out to wrap the entire `if (totalFrames > 0)` initialization sequence. This fully decouples the initial frame processing logic into two parallel, contiguous blocks (one strictly for DOM, one strictly for Canvas), preventing interleaved condition evaluations. Note: A similar unrolling was planned for the `hasProcessFn` path in PERF-990, but this focuses strictly on the `!hasProcessFn` branch (lines 410+).

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` and `canvas` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Repeated V8 branch evaluations and AST parser overhead in single-worker initialization.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` to unroll initial single worker frame processing for `!hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `!hasProcessFn` path (around line 410), hoist the `isDomStrategy` check out of the individual blocks to wrap the entire initial frame processing up to the while loops. It should decouple into two distinct branches: one for DOM, one for Canvas.

**Why**: Unrolling this reduces the number of inline cache nodes created during V8 JIT and gives the compiler a unified, predictable execution path, speeding up function compilation footprint and parsing time. It completely splits the `isDomStrategy` paths without any interleaved boolean checks.

## Correctness Check
Run `npm run test -w packages/renderer` or specific test files to ensure Canvas and DOM paths are fully functioning.
