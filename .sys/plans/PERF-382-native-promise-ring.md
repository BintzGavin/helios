---
id: PERF-382
slug: native-promise-ring
status: unclaimed
claimed_by: ""
created: 2024-05-01
completed: ""
result: ""
---

# PERF-382: Pipeline CaptureLoop with Native Promise Ring

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts`

## Background Research
The `CaptureLoop` currently implements an actor model using custom ring arrays (`frameReadyRing`, `frameErrorRing`, `frameBufferRing`) and manual V8 Promise executor caching (`writerWaiterResolve`, `workerBlockedResolves`, `frameWaiterResolve`).
While this avoids closure allocation, it requires the main writer loop to block synchronously awaiting worker updates through these custom flags, and requires workers to frequently execute state checks `checkState()`.
We can significantly simplify this code and leverage V8's highly optimized native Promise chaining by replacing the custom ring buffers with a single `Array<Promise<Buffer | string>>`.
When a worker starts a task, it simply places the `Promise` returned by `strategy.capture()` directly into the array at the correct index. The writer loop simply `await`s the native Promise sequentially. This lets the V8 engine natively schedule and pipeline the tasks, removing overhead.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: Custom event-loop scheduling overhead and manual backpressure ring array checks blocking the hot write loop.

## Implementation Spec

### Step 1: Replace custom ring buffers with Promise ring
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `run()`, remove `frameBufferRing`, `frameErrorRing`, `frameReadyRing`, `writerWaiterResolve`, `writerWaiterExecutor`, `frameWaiterResolve`, `frameWaiterExecutor`, and `checkState()` logic related to them.

Replace with:
```typescript
const framePromisesRing = new Array<Promise<Buffer | string | null>>(maxPipelineDepth).fill(Promise.resolve(null));
let workerAvailableResolves = new Array<() => void>();
```

### Step 2: Refactor `runWorker` to push Promises directly
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update `runWorker` to continuously pull from `nextFrameToSubmit`.
If `nextFrameToSubmit - nextFrameToWrite >= maxPipelineDepth`, await a `Promise` pushed to `workerAvailableResolves` to implement backpressure.
Once it gets an index `i`, immediately create the capture Promise:
```typescript
const capturePromise = (async () => {
    await timeDriver.setTime(page, compositionTimeInSeconds);
    return strategy.capture(page, time);
})();
framePromisesRing[i & ringMask] = capturePromise;
```

### Step 3: Refactor the writer loop to await native Promises
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
The main writer loop simply does:
```typescript
while (nextFrameToWrite < this.totalFrames && !aborted) {
    if (nextFrameToWrite >= nextFrameToSubmit) {
       // Yield or wait for worker to submit
       await new Promise(r => setImmediate(r));
       continue;
    }

    const ringIndex = nextFrameToWrite & ringMask;
    const buffer = await framePromisesRing[ringIndex];
    // write to stdin, update nextFrameToWrite, pop workerAvailableResolves to unblock
}
```

**Why**: Simplifies V8 object graph and leverages native C++ Promise resolution queue instead of manually ping-ponging closures.
**Risk**: Potential backpressure handling differences if `maxPipelineDepth` is hit often.

## Canvas Smoke Test
Run `cd packages/renderer && npx tsx tests/verify-canvas-strategy.ts`

## Correctness Check
Run `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`

## Prior Art
V8 optimization guidelines on native Promise chaining vs manual event emission.
