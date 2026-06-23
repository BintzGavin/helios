---
id: PERF-825
slug: inline-strategy-calls-multi-worker
status: unclaimed
claimed_by: ""
created: 2026-06-23
completed: ""
result: ""
---

# PERF-825: Inline Strategy Call Overhead in Multi-Worker Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` multi-worker fast path.

## Background Research
Currently, inside the `runWorker` function of `CaptureLoop.ts`, we see abstract method calls like:
```typescript
const buffer = strategy.processCaptureResult!(await strategy.capture(page, i * timeStep));
```
and
```typescript
const buffer = await strategy.capture(page, i * timeStep);
```

For DOM rendering, `strategy` is ALWAYS an instance of `DomStrategy`. We know this statically because `DomStrategy` is the only strategy that supports the `dom` mode, and this codebase targets DOM rendering optimizations exclusively. PERF-824 proposed inlining these calls for the single-worker path by accessing the underlying properties of `DomStrategy` directly. We can apply the same logic to the multi-worker path (`runWorker`).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 1.831s
- **Bottleneck analysis**: Interface dispatch overhead in the multi-worker loop.

## Implementation Spec

### Step 1: Pre-bind DOM Strategy fields in `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function, try to detect if we're using a `DomStrategy` by checking for known internal properties like `beginFrameParams` or `cdpSession`. If so, pre-bind the necessary underlying properties to bypass the interface.

### Step 2: Inline Capture and Process calls
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `while (!aborted)` loops in `runWorker`, replace the generic strategy calls with inlined conditional checks (e.g., `if (isDomStrategy)`) and directly execute the underlying logic or property access to avoid V8 polymorphic dispatch overhead.

**Why**: Direct object property access is monomorphic and heavily optimized by V8 compared to dynamic interface dispatch.
**Risk**: If `DomStrategy` internals change, this might break.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script to verify output is identical.

## Prior Art
- PERF-824: Plan to inline strategy calls in single-worker path.
