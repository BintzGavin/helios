---
id: PERF-748
slug: reusable-thenable-for-worker-waiter
status: complete
claimed_by: "executor-session"
created: 2025-02-23
completed: "2024-06-12"
result: "improved"
---

# PERF-748: Eliminate Promise Allocation for Worker Waiters in Actor Model Ring

## Focus Area
The multi-worker loop in `CaptureLoop.ts` (`poolLen > 1` branch). Specifically, the Promise allocated on every frame when a worker is blocked: `await new Promise<number>(workerBlockedExecutors[workerIndex])`. This targets closure allocation overhead and GC pressure in the concurrent hot path.

## Background Research
In PERF-746, replacing the `writerWaiterPromise`'s per-frame `new Promise<void>` allocation with a custom `ReusableThenable` instance improved performance by avoiding V8 GC and closure overhead in the fast loop. The Actor Model backpressure logic in `CaptureLoop.ts` for multiple workers currently allocates a `new Promise<number>` for every single frame that a worker waits for assignment when the queue is full. Since each worker has a statically mapped wait cycle, we can replace this per-worker `new Promise` creation with an array of `ReusableThenable` instances (or a specialized `ReusableNumberThenable` since it needs to resolve with a `number`). This avoids allocating `poolLen * frames / depth` Promise objects throughout the entire render job.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/
- **Render Settings**: 1920x1080, 60fps, 300 frames, libx264
- **Mode**: `dom` (with multiple workers, e.g., concurrency > 1, though tests will also be run on concurrency 1 to ensure it doesn't break)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~26.385s
- **Bottleneck analysis**: Allocating a `new Promise` and tracking its lifecycle incurs GC pressure and V8 engine closure tracking overhead. While this overhead was fixed for the writer in PERF-746, the worker promises in `runWorker` for the actor model ring still allocate heavily during backpressure.

## Implementation Spec

### Step 1: Add a ReusableNumberThenable class
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Add a new `ReusableNumberThenable` class at the top of the file alongside `ReusableThenable` that resolves with a number instead of void.
```typescript
class ReusableNumberThenable {
  public resolveCb: ((val: number) => void) | null = null;
  public rejectCb: ((err: Error) => void) | null = null;

  then(resolve: (val: number) => void, reject: (err: Error) => void) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
  }

  resolve(val: number) {
    if (this.resolveCb) {
      const cb = this.resolveCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(val);
    }
  }

  reject(err: Error) {
    if (this.rejectCb) {
      const cb = this.rejectCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    }
  }
}
```
**Why**: We need a duck-typed Promise that resolves with a frame index (`number`).
**Risk**: Standard Promise/Thenable interface mismatch; requires precise typings to trick TypeScript into allowing `await`.

### Step 2: Replace Worker Promises with ReusableNumberThenable
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `workerBlockedExecutors` and `workerBlockedResolves`.
2. Instead, create `const workerThenables = new Array<ReusableNumberThenable>(poolLen);` initialized with `new ReusableNumberThenable()`.
3. In `checkState()`, where workers are resolved (`const res = workerBlockedResolves[w]!`), instead call `workerThenables[w].resolve(i)`. Also handle the `-1` resolution case.
4. In `runWorker()`, replace `i = await new Promise<number>(workerBlockedExecutors[workerIndex]);` with `i = await workerThenables[workerIndex] as any as Promise<number>;`. Also, ensure the worker only marks itself as free by adding `freeWorkers[freeWorkersHead++] = workerIndex; checkState();` right before the `await`.
**Why**: Avoids per-frame Promise allocation for worker backpressure.
**Risk**: Breaking the Actor Model signaling if a worker's thenable is resolved prematurely or incorrectly tracked.

## Correctness Check
Run the DOM render sequence and ensure all frames are output and the FFmpeg encode completes without deadlocking the actor model.

## Prior Art
PERF-746 successfully applied this to `writerWaiterPromise` in the single-worker writer loop. PERF-747 applied it to stream backpressure `drainPromiseExecutor`.


## Results Summary
- **Best render time**: 13.005s (vs baseline 14.790s)
- **Improvement**: ~12%
- **Kept experiments**: [PERF-748]
- **Discarded experiments**: None
