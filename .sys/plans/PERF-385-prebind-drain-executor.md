---
id: PERF-385
slug: prebind-drain-executor
status: complete
claimed_by: "Jules"
created: 2024-05-18
completed: 2024-05-18
result: "discard"
---

# PERF-385: Prebind Drain Promise Executor in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `writeToStdin` method backpressure handling.

## Background Research
In `CaptureLoop.ts`, when `ffmpegManager.stdin.write` returns `false` (indicating backpressure), the `writeToStdin` method returns a new `Promise` to wait for the stream to drain. Currently, this involves a dynamically allocated inline closure: `new Promise<void>((resolve, reject) => { this.drainResolve = resolve; this.drainReject = reject; })`. During heavy I/O where FFmpeg write buffers fill quickly, this closure is allocated frequently. By prebinding the executor function, we can eliminate this V8 garbage collection overhead in the pipeline.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: Standard benchmark resolution and duration.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: Anonymous closure allocations for `Promise` executors inside `writeToStdin` cause GC churn during FFmpeg backpressure events.

## Implementation Spec

### Step 1: Prebind the drain promise executor
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Add a private class property: `private drainPromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => { this.drainResolve = resolve; this.drainReject = reject; };`
2. Modify `writeToStdin` to use the prebound executor when returning a Promise upon backpressure.

Change:
```typescript
    if (!canWriteMore) {
        return new Promise<void>((resolve, reject) => {
            this.drainResolve = resolve;
            this.drainReject = reject;
        });
    }
```
To:
```typescript
    if (!canWriteMore) {
        return new Promise<void>(this.drainPromiseExecutor);
    }
```

**Why**: Eliminates dynamic allocation of the `(resolve, reject)` closure, reducing garbage collection pressure when the `CaptureLoop` encounters I/O backpressure.
**Risk**: Minimal. The behavior and scope of `resolve` and `reject` remain exactly identical, but the function allocation is hoisted to the class level.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npx tsx tests/verify-codecs.ts` to verify basic canvas and DOM stream handling.

## Correctness Check
Run `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`.

## Prior Art
- `PERF-383`: Prebound the `screencastPromiseExecutor` in `DomStrategy.ts`.
- `PERF-337`: Prebound `frameWaiterResolve` executor into `frameWaiterExecutor`.

## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|---|---|---|---|---|---|---|
| 1 | 1.768 | 60 | 33.94 | 0.0 | keep | baseline |
| 2 | 1.849 | 60 | 32.45 | 0.0 | keep | baseline |
| 3 | 1.814 | 60 | 33.08 | 0.0 | keep | baseline |
| 4 | 2.926 | 60 | 20.51 | 0.0 | discard | experiment (prebind drain executor) |
| 5 | 1.894 | 60 | 31.68 | 0.0 | discard | experiment (prebind drain executor) |
| 6 | 2.535 | 60 | 23.67 | 0.0 | discard | experiment (prebind drain executor) |
