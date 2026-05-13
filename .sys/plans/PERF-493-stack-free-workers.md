---
id: PERF-493
slug: stack-free-workers
status: unclaimed
claimed_by: ""
created: 2026-05-13
completed: ""
result: ""
---
# PERF-493: Track Free Workers with Stack in CaptureLoop

## Focus Area
The actor model orchestrator loop (`CaptureLoop.ts`).

## Background Research
Currently, the `checkState()` function iterates through the entire worker pool (`poolLen`, which is usually equal to `os.cpus().length` or limited to 3 in tests) using a `for` loop to find workers that are blocked and assign them new frames:
```typescript
        // See if we can assign tasks to waiting workers
        for (let w = 0; w < poolLen; w++) {
            if (!workerBlockedResolves[w] || nextFrameToSubmit >= this.totalFrames || nextFrameToSubmit - nextFrameToWrite >= maxPipelineDepth) {
                continue;
            }
```
In a tight hot-loop that executes thousands of times per second (especially after PERF-492 dramatically sped up orchestration), iterating linearly over the pool arrays (`workerBlockedResolves`) just to find a non-null entry creates small but compounding CPU cache and branching overhead.

By utilizing a pre-allocated integer array as a **stack** (`freeWorkers` array + `freeWorkersHead` counter), we can achieve O(1) push and pop of available worker indices, entirely eliminating the `for` loop and the need to scan `workerBlockedResolves` arrays to discover free workers.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.597s (PERF-492)
- **Bottleneck analysis**: Linear array scanning for free workers taking CPU cycles away from Playwright IPC.

## Implementation Spec

### Step 1: Initialize Stack Data Structures
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, initialize a stack for free workers.
```typescript
    const freeWorkers = new Int32Array(poolLen);
    let freeWorkersHead = 0;
```
When a worker becomes blocked waiting for a task, we will push its index onto this stack.

### Step 2: Push Workers to Stack
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Instead of `workerBlockedExecutors` assigning to `workerBlockedResolves[w] = resolve`, it will also push to the stack:
```typescript
    const workerBlockedExecutors = new Array(poolLen);
    for (let w = 0; w < poolLen; w++) {
        workerBlockedExecutors[w] = (resolve: (i: number) => void) => {
            workerBlockedResolves[w] = resolve;
            freeWorkers[freeWorkersHead++] = w;
            checkState(); // Trigger checkState since a worker just became free
        };
    }
```

### Step 3: Pop Workers from Stack in `checkState`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `checkState()`, replace the `for (let w = 0; w < poolLen; w++)` loop with a `while` loop that pops from `freeWorkers`:
```typescript
        while (freeWorkersHead > 0 && nextFrameToSubmit < this.totalFrames && nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
            const w = freeWorkers[--freeWorkersHead];
            const res = workerBlockedResolves[w]!;
            workerBlockedResolves[w] = null;

            const i = nextFrameToSubmit++;
            const ringIndex = i & ringMask;

            frameReadyRing[ringIndex] = 0;
            frameBufferRing[ringIndex] = null;
            frameErrorRing[ringIndex] = null;

            if (frameWaiterResolve) {
                const fRes = frameWaiterResolve;
                frameWaiterResolve = null;
                fRes();
            }

            res(i);
        }
```

### Step 4: Handle Abort / Completion Cleanup
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `checkState()` for `aborted` or `nextFrameToSubmit >= this.totalFrames`:
```typescript
        if (aborted) {
            while (freeWorkersHead > 0) {
                const w = freeWorkers[--freeWorkersHead];
                if (workerBlockedResolves[w]) {
                    workerBlockedResolves[w]!(-1);
                    workerBlockedResolves[w] = null;
                }
            }
// ...
        if (nextFrameToSubmit >= this.totalFrames) {
            while (freeWorkersHead > 0) {
                const w = freeWorkers[--freeWorkersHead];
                if (workerBlockedResolves[w]) {
                    workerBlockedResolves[w]!(-1);
                    workerBlockedResolves[w] = null;
                }
            }
        }
```

## Variations
- **Variation A**: Use a linked list embedded in `workerBlockedResolves` or a dedicated array if Int32Array push/pop overhead is higher, but a simple Int32Array with a pointer should be fastest in V8.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure FFmpeg successfully encodes all frames and no workers are starved or leaked.