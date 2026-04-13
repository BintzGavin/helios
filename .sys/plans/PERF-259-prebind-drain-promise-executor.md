---
id: PERF-259
slug: prebind-drain-promise-executor
status: unclaimed
claimed_by: ""
created: 2026-04-13
completed: ""
result: ""
---

# PERF-259: Prebind CaptureLoop Drain Promise Executor

## Focus Area
DOM Rendering Pipeline - Buffer Drain Logic in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
During the `CaptureLoop.run()` execution, when `writeToStdin` encounters backpressure (`canWriteMore` is false), it creates a new Promise to wait for the FFmpeg stream's `drain` event:
```typescript
    if (!canWriteMore) {
        return new Promise<void>((resolve, reject) => {
            this.drainResolve = resolve;
            this.drainReject = reject;
        });
    }
```
If the CPU is highly constrained or `maxPipelineDepth` is hit rapidly, FFmpeg backpressure events will fire, resulting in this anonymous closure `(resolve, reject) => { ... }` being allocated repeatedly in the hot loop. V8 garbage collection can be improved by pre-binding such callbacks. By extracting this executor into an arrow function class property, we eliminate the closure allocation entirely.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 600x600 resolution, 30 FPS, 150 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: V8 garbage collection from anonymous closure allocations during frame capture backpressure handling.

## Implementation Spec

### Step 1: Pre-bind the Promise Executor
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Add a new class property to `CaptureLoop`:
```typescript
  private handleDrainPromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => {
    this.drainResolve = resolve;
    this.drainReject = reject;
  };
```
And update `writeToStdin` to use it:
```typescript
    if (!canWriteMore) {
        return new Promise<void>(this.handleDrainPromiseExecutor);
    }
```

**Why**: Eliminates closure allocation when handling stream backpressure inside the capture hot loop.
**Risk**: Negligible. Context is already correctly bound using the arrow function class property.

## Variations
None.

## Canvas Smoke Test
Run a basic canvas test to ensure no breakage.

## Correctness Check
Run the tests/benchmarks.

## Prior Art
PERF-253 (pre-bound `onWriteError`), PERF-252 (pre-bound `CdpTimeDriver.setTime` callback).
