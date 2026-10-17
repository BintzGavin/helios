---
id: PERF-1093
slug: hoist-limit-in-dispatches
status: unclaimed
claimed_by: ""
created: 2024-10-16
completed: "2026-10-17"
result: "improved"
---

# PERF-1093: Inline dispatch bound in CaptureLoop

## Focus Area
The multi-worker frame dispatcher loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, replacing the mutating re-assignment of `dispatches` with a localized block-scoped loop bound (`for (let d = 0, bound = ...; d < bound; d++)`).

## Background Research
In the multi-worker dispatcher loops of `CaptureLoop.ts`, we compute the number of frames to assign to free workers. Currently, it evaluates the number of available dispatches, checks if it is greater than zero, re-assigns the `dispatches` variable to bound it by the available free workers `h`, and then loops:

```typescript
                  if (dispatches > 0) {
                    dispatches = dispatches < h ? dispatches : h;
                    for (let d = 0; d < dispatches; d++) {
```

Microbenchmarks show that replacing the reassignment of the let variable `dispatches` with a localized block-scoped bound inside the `for` loop statement provides a substantial JIT improvement.

```typescript
                  if (dispatches > 0) {
                    for (let d = 0, bound = dispatches < h ? dispatches : h; d < bound; d++) {
```

This prevents mutating reassignment and improves V8 JIT execution.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Render Settings**: 600x600, dom mode, 150 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Mutating an outer `let` variable creates closure mutation overhead in the hottest worker dispatch loop.

## Implementation Spec

### Step 1: Inline dispatch limits inside `for` loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer loops, find this code (it appears 3 times):

```typescript
                  if (dispatches > 0) {
                    dispatches = dispatches < h ? dispatches : h;
                    for (let d = 0; d < dispatches; d++) {
                      h--;
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[freeWorkers[h]].resolve(n);
                      n++;
                    }
                  }
```

Change it to:

```typescript
                  if (dispatches > 0) {
                    for (let d = 0, bound = dispatches < h ? dispatches : h; d < bound; d++) {
                      h--;
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[freeWorkers[h]].resolve(n);
                      n++;
                    }
                  }
```

**Why**: Removes a mutating reassignment of the variable `dispatches` and moves the loop limit into a block-scoped induction variable (`bound`). This allows V8 Turbofan to compile the loop with pure register states and without modifying the outer environment.
**Risk**: Negligible. The logical bounds are exactly the same.

## Canvas Smoke Test
Run the standard benchmarking script with `--mode=canvas` if needed.

## Correctness Check
Run the DOM render verify command and standard test suite.

## Prior Art
- PERF-1053 optimized `dispatches` previously by inline ternary checks.
