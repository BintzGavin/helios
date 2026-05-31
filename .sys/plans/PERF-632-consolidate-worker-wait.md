---
id: PERF-632
slug: consolidate-worker-wait
status: complete
claimed_by: "executor-session"
created: 2024-05-31
completed: "2024-05-31"
result: "discarded"
---

# PERF-632: Consolidate `CaptureLoop` Worker Wait Logic to Reduce Microtask Overhead

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - specifically the `runWorker` and `checkState` actor-model synchronization logic.

## Background Research
Currently, when a worker reaches `maxPipelineDepth`, it awaits a Promise created dynamically with `workerBlockedExecutors`:
`i = await new Promise<number>(workerBlockedExecutors[workerIndex]);`
This blocks the generator/async loop, causing V8 to allocate microtasks and a closure context per block event. Later, when `checkState` runs on the `writerWaiter` path, it resolves this Promise:
`const res = workerBlockedResolves[w]!; workerBlockedResolves[w] = null; res(i);`

Since we are using `BrowserPool` concurrency of 1 (a single worker), the multi-worker queue mechanism adds unnecessary Promise allocation overhead in the extremely hot loop. While PERF-624 tried to bypass the actor model completely and didn't see huge gains, optimizing the multi-worker loop to use a more direct pre-bound promise structure for blocking can squeeze out the remaining V8 Promise allocation overhead.

Since Node 22 V8 is highly optimized for synchronous logic, we can replace the `workerBlockedExecutors` executor allocation with a deferred object approach, avoiding recreating the `new Promise` wrapper per frame when backpressured.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/output/example-build/composition.html
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: V8 garbage collection and microtask overhead allocating `new Promise` inside the `runWorker` loop whenever the pipeline is full.

## Implementation Spec

### Step 1: Replace Worker Promise Allocation with a Reusable Deferred
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `workerBlockedExecutors` array.
2. Replace `workerBlockedResolves` with a `workerBlockedPromises` array that stores `{ promise: Promise<number>, resolve: (i: number) => void } | null`.
3. In `checkState`, when unblocking a worker:
```typescript
const deferred = workerBlockedPromises[w]!;
workerBlockedPromises[w] = null;
deferred.resolve(i);
```
4. In `runWorker`, when blocking:
```typescript
let deferred = workerBlockedPromises[workerIndex];
if (!deferred) {
    let res: (i: number) => void;
    const p = new Promise<number>(resolve => { res = resolve; });
    deferred = { promise: p, resolve: res! };
    workerBlockedPromises[workerIndex] = deferred;
    freeWorkers[freeWorkersHead++] = workerIndex;
    checkState();
}
i = await deferred.promise;
```
**Why**: Avoids calling `new Promise` on every backpressure hit. By reusing the deferred promise setup mechanism (and only allocating it when genuinely blocking), we reduce V8 allocation overhead in the hot loop.
**Risk**: Standard deferred promise pattern, minimal risk.

## Variations
No variations planned.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts`.


## Results Summary
- **Best render time**: 2.610s (vs baseline ~2.16s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Consolidate `CaptureLoop` Worker Wait Logic]