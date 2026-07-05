---
id: PERF-926
slug: decouple-dispatch-induction
status: unclaimed
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---

# PERF-926: Decouple Induction Variables in Worker Dispatch Loop

## Focus Area
`CaptureLoop.ts` - Free worker dispatch loop in the multi-worker path (`for (let d = 0; d < dispatches; d++)`).

## Background Research
Currently, the multi-worker dispatch loop iterates over `dispatches` and linearly mutates `freeWorkersHead--` and `nextFrameToSubmit++` within each iteration. These loop-carried serial dependencies limit the V8 TurboFan compiler from aggressively pipelining or unrolling the loop body, as each iteration is strictly data-dependent on the previous iteration's mutated counters. By hoisting the state mutations outside the loop (`nextFrameToSubmit += dispatches` and `freeWorkersHead -= dispatches`) and indexing the arrays using pure math based on the loop counter `d`, we can make the loop iterations fully independent. This allows V8 to generate tighter assembly.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard resolution, FPS, duration, codec
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `for` loop body forces strict serial evaluation of `freeWorkersHead` and `nextFrameToSubmit`.

## Implementation Spec

### Step 1: Decouple loop variables
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the 4 places where the worker dispatch loop occurs:
Replace:
```typescript
                  if (dispatches > 0) {
                    dispatches = Math.min(dispatches, freeWorkersHead);
                    for (let d = 0; d < dispatches; d++) {
                      freeWorkersHead--;
                      const w = freeWorkers[freeWorkersHead];
                      const n = nextFrameToSubmit;
                      nextFrameToSubmit++;
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                    }
                  }
```
With:
```typescript
                  if (dispatches > 0) {
                    let count = dispatches < freeWorkersHead ? dispatches : freeWorkersHead;
                    const startN = nextFrameToSubmit;
                    const startHead = freeWorkersHead - count;
                    nextFrameToSubmit += count;
                    freeWorkersHead = startHead;

                    for (let d = 0; d < count; d++) {
                      const w = freeWorkers[startHead + count - 1 - d];
                      const n = startN + d;
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
                    }
                  }
```

**Why**: Transforms the loop into a pure function mapping over `d`, eliminating loop-carried state mutations and allowing the compiler to pipeline the array accesses and `workerThenables` resolutions. It also includes the `Math.min` -> ternary optimization from unclaimed PERF-921.

## Variations
None.

## Canvas Smoke Test
Standard canvas render.

## Correctness Check
Frames must be processed in the exact same sequence; `freeWorkersHead` and `nextFrameToSubmit` bounds checks remain identical.

## Prior Art
- PERF-922 separated `const n = nextFrameToSubmit++` into separate assignment and increment lines, yielding an 8.8% reduction in overhead. This goes a step further by decoupling them from the loop body entirely.
