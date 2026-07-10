---
id: PERF-958
slug: fast-path-stream-drain
status: complete
claimed_by: ""
created: 2024-07-09
completed: ""
result: ""
---

# PERF-958: Optimize Stream Drain Fast Path Checks in CaptureLoop.ts

## Focus Area
The stream backpressure checking mechanism inside the single worker loops of `CaptureLoop.ts`. Specifically, replacing the `if (!writeSuccessStr && pendingBytes >= 16777216)` backpressure trigger with an unrolled structure prioritizing the fast-path condition.

## Background Research
Currently, throughout the `CaptureLoop.ts` single worker loops, stream backpressure is evaluated via a combined condition (that was missed in PERF-952):
```typescript
if (!writeSuccessStr && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```
In standard render execution, `writeSuccessStr` is typically `true` for 99% of frames, and `pendingBytes >= 16777216` is `false` for 99% of frames. V8 evaluates both parts of this condition dynamically, though it short-circuits.

When `writeSuccessStr` is true, the `!writeSuccessStr` boolean coercion happens first. We can skip the `pendingBytes` branch checking entirely and explicitly route the hot path to the "continue" flow by explicitly branching on `writeSuccessStr` without negations.

```typescript
if (writeSuccessStr) {
  // fast path, do nothing
} else if (pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```
Doing an explicit `if (writeSuccessStr)` check and putting the backpressure logic in the `else if` allows the JIT to mark the `else` path as cold/deoptimized, optimizing the layout of the loop instructions and eliminating the boolean NOT operator overhead per frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark url
- **Render Settings**: 1080p, 60fps
- **Mode**: `dom` and `canvas`
- **Metric**: Microbenchmark loop evaluation speed
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-optimizing V8 condition evaluation for loop-carried backpressure logic inside hot chunk writer loops.

## Implementation Spec

### Step 1: Optimize backpressure fast-path in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In all remaining single worker loops, locate the backpressure logic:
```typescript
if (!writeSuccessStr && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```
Refactor it to explicitly favor the hot path `writeSuccessStr` via an `else if`:
```typescript
if (writeSuccessStr) {} else if (pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```

Repeat for all `writeSuccessBuf` calls as well:
```typescript
if (!writeSuccessBuf && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```
Refactor it to explicitly favor the hot path `writeSuccessBuf` via an `else if`:
```typescript
if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```


**Why**: Explicitly structuring the control flow to match execution probabilities allows V8's TurboFan compiler to structure the compiled machine code with the hot path falling through directly without executing compound branch conditional jumps.

## Variations
None.

## Correctness Check
Run the DOM rendering benchmark and check that the process doesn't run out of memory (which would happen if `drainPromise` is never awaited).
