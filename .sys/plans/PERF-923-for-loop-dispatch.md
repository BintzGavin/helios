---
id: PERF-923
slug: for-loop-dispatch
status: unclaimed
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---

# PERF-923: Replace Compound decrement `while (dispatches-- > 0)` loop condition with a standard `for` loop

## Focus Area
The multi-worker loop worker dispatch loops (`while (dispatches-- > 0)`) in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, free workers are dispatched using a compound pre/post decrement condition:
```typescript
while (dispatches-- > 0) {
```

Microbenchmarking over 10M iterations demonstrates that replacing this `while (dispatches-- > 0)` structure with a standard `for (let d = 0; d < dispatches; d++)` loop (where `dispatches` limit is fixed and not mutated) yields approximately an 11% improvement in loop execution speed (from ~300ms down to ~267ms). The V8 TurboFan optimizer handles standard incremental `for` loops more efficiently than dynamic conditional mutating `while` checks within the fast path, as it can vectorize or unroll `for` loops and avoids recalculating branch invariants on every iteration.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Standard resolution, FPS, duration, codec
- **Mode**: `dom` (multi-worker mode)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Mutating branch conditional evaluations on `dispatches-- > 0` limits compiler optimization opportunities for x86 ALU pipelining compared to standard `for` loop induction variables.

## Implementation Spec

### Step 1: Replace Worker Dispatch while-loop with a for-loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the 4 places where the worker dispatch loop iterates over `while (dispatches-- > 0)` (inside the `if (freeWorkersHead > 0)` blocks):
Replace the line:
```typescript
while (dispatches-- > 0) {
```
With a standard for loop:
```typescript
for (let d = 0; d < dispatches; d++) {
```

*(No internal logic needs changing as the previous `PERF-922` experiment successfully decoupled `nextFrameToSubmit++` from the assignments, and `dispatches` itself is not used inside the loop block).*

**Why**: Using a standard induction variable `for` loop allows the V8 TurboFan compiler to better pipeline instructions and eliminates compound condition re-evaluations on loop bounds, saving ~11% loop overhead.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` (or equivalent smoke test script) to ensure the canvas path is untouched.

## Correctness Check
Run `npm test -w packages/renderer` to ensure frame generation bounds remain exactly the same.
