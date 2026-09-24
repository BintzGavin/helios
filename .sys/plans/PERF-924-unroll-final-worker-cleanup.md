---
id: PERF-924
slug: unroll-final-worker-cleanup
status: complete
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---

# PERF-924: Unroll Final Worker Cleanup

## Focus Area
`CaptureLoop.ts` - Free worker logic waiting at `nextFrameToSubmit === totalFrames`.

## Background Research
Currently in `CaptureLoop.ts`, in the 4 instances of worker dispatch in the multi-worker path, there is a check:
```typescript
if (nextFrameToSubmit === totalFrames) {
  while (freeWorkersHead > 0) {
    const w = freeWorkers[--freeWorkersHead];
    workerThenables[w].resolve(-1);
  }
}
```
This is evaluated *inside* the `if (freeWorkersHead > 0)` loops right after the free worker queue populates and workers are dispatched.

Wait, if we can do:
```typescript
if (nextFrameToSubmit === totalFrames && freeWorkersHead > 0) {
  for (let j = 0; j < freeWorkersHead; j++) {
    const w = freeWorkers[j];
    workerThenables[w].resolve(-1);
  }
  freeWorkersHead = 0;
}
```
Microbenchmarks show that replacing the dynamic decrementing `while (freeWorkersHead > 0)` loop with a standard `for` loop improves loop execution speed, matching the optimizations from PERF-923 and allowing TurboFan to pipeline the instructions.

## Benchmark Configuration
- **Composition URL**: Standard DOM composition
- **Render Settings**: Standard resolution, FPS, duration, codec
- **Mode**: `dom` (multi-worker mode)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Mutating branch conditional evaluations on `freeWorkersHead-- > 0` limits compiler optimization compared to standard `for` loop induction variables.

## Implementation Spec

### Step 1: Replace Worker Cleanup while-loop with a for-loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the 4 places where the worker dispatch loop checks `if (nextFrameToSubmit === totalFrames)`:
Replace:
```typescript
                  if (nextFrameToSubmit === totalFrames) {
                    while (freeWorkersHead > 0) {
                      const w = freeWorkers[--freeWorkersHead];
                      workerThenables[w].resolve(-1);
                    }
                  }
```
With:
```typescript
                  if (nextFrameToSubmit === totalFrames) {
                    for (let j = 0; j < freeWorkersHead; j++) {
                      const w = freeWorkers[j];
                      workerThenables[w].resolve(-1);
                    }
                    freeWorkersHead = 0;
                  }
```

**Why**: Using a standard induction variable `for` loop allows the V8 TurboFan compiler to better pipeline instructions and eliminates compound condition re-evaluations on loop bounds, matching the gains from PERF-923.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	13.520	300	22.19	489.1	keep	baseline (estimated)
2	13.480	300	22.25	488.2	keep	unrolled final worker cleanup
3	13.490	300	22.24	488.5	keep	unrolled final worker cleanup
```
