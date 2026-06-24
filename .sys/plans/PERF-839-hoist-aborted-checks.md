---
id: PERF-839
slug: hoist-aborted-checks
status: unclaimed
claimed_by: ""
created: 2024-06-25
completed: ""
result: ""
---

# PERF-839: Hoist Error and Worker Polling in Multi-Worker Loop

## Focus Area
The multi-worker write loop in `CaptureLoop.ts` constantly polls for task assignments (`freeWorkersHead > 0`), errors (`capturedErrors.length > 0`), and abort signals (`signal.aborted`) on every frame iteration and after every `await`.

## Background Research
Currently, the multi-worker paths (lines ~914-1050) rely heavily on polling within the hot loops:
```typescript
if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
    checkState();
}
```
This is evaluated up to 3 times per frame!
1. At the top of the writer loop
2. Inside the wait loop for `writerWaiterPromise`
3. After awaiting `drainPromise`

However:
- **Errors**: Workers immediately call `checkState()` when an error occurs (`catch (e) { aborted = true; checkState(); }`), which marks `aborted = true` and resolves `writerWaiterPromise`. The writer loop only needs to check `if (aborted) break;` instead of checking the array length.
- **Workers Freeing**: Workers also call `checkState()` when they finish a frame (`freeWorkers[freeWorkersHead++] = workerIndex; checkState();`). The only time the *writer* needs to trigger `checkState()` for workers is right after `nextFrameToWrite++`, because that event opens up pipeline capacity (the `maxPipelineDepth` constraint loosens).
- **Abort Signal**: We can set up an event listener on the `signal` object before the multi-worker loops start (just like in the single-worker path), so it immediately aborts the loop.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Mode**: `dom` (multi-worker uses DOM mode by default if enabled, we should test with multiple workers)
- **Metric**: Wall-clock render time or microbenchmark loop iteration time.
- **Minimum runs**: 3 per experiment, report median.

## Implementation Spec

### Step 1: Hoist Abort Listener
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `else` block (line ~675):
Add an `abortListener` like the single-worker path:
```typescript
let abortListener: (() => void) | null = null;
if (signal) {
    if (signal.aborted) { aborted = true; checkState(); }
    abortListener = () => { aborted = true; checkState(); };
    signal.addEventListener('abort', abortListener);
}
```

### Step 2: Remove Polling Checks from Writer Loops
**What to change**:
In the `nextFrameToWrite` write loops, completely replace all instances of:
```typescript
if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
    checkState();
}
```
with:
```typescript
// Nothing! We just rely on workers and listeners to call checkState and set aborted=true.
```
*Wait*, we must keep a check right after `nextFrameToWrite++`, because freeing a spot in the ring buffer allows a waiting worker to proceed.
So after `nextFrameToWrite++;`:
```typescript
if (freeWorkersHead > 0) checkState();
```

Inside the loop, keep only:
```typescript
if (aborted) break;
```
For example, the inner `await` loops become:
```typescript
while (frameReadyRing[ringIndex] === 0 && !aborted) {
    await writerWaiterPromise;
}
if (aborted) break;
```

### Step 3: Cleanup Event Listener
**What to change**:
In the `finally` or at the end of the multi-worker execution block, clean up the event listener:
```typescript
if (signal && abortListener) {
    signal.removeEventListener('abort', abortListener);
}
```

## Variations
None. This strictly reduces polling and eliminates unnecessary branch evaluations in the hot path.
