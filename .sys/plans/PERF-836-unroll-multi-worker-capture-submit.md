---
id: PERF-836
slug: unroll-multi-worker-capture-submit
status: unclaimed
claimed_by: ""
created: 2024-06-24
completed: ""
result: ""
---

# PERF-836: Unroll Branching in Multi-Worker Loop Submission

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast path (`runWorker`) inside the multi-worker execution loop (`if (poolLen === 1) { ... } else { ... }`).

## Background Research
In the multi-worker loop, `runWorker` determines which frame index `i` to capture next using an `if-else` chain that manages pipeline depth. It does this check on every iteration:

```typescript
while (!aborted) {
    let i: number;
    if (aborted || nextFrameToSubmit >= totalFrames) {
        i = -1;
    } else if (nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth) {
        i = nextFrameToSubmit++;
        const ringIndex = i & ringMask;
        frameReadyRing[ringIndex] = 0;
        frameBufferRing[ringIndex] = null;
    } else {
        freeWorkers[freeWorkersHead++] = workerIndex;
        checkState();
        i = (await workerThenables[workerIndex] as any) as number;
    }

    if (i === -1) break;
    // ... logic ...
}
```

This structure causes high branch prediction overhead. While `nextFrameToSubmit < totalFrames` and `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` usually resolve to true, the structure mixes fast submission (synchronous integer increment) with blocked states (awaiting `workerThenables`) dynamically.

By unswitching and hoisting these checks, similar to how we unswitched the write loops and progress logging loops in the single-worker path, we can reduce dynamic branch evaluation. We can also skip `aborted` checks inside the inner fast-submission loop because if we submit to the pipeline fast, we only abort when the entire process crashes (which throws anyway).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: Microbenchmarks show that hoisting `i + 1 < totalFrames` branch checks out of hot capture loops significantly drops execution time (PERF-822, ~11% improvement). Applying this pattern to the more complex multi-worker scheduling loop could yield similar gains.

## Implementation Spec

### Step 1: Hoist Pipeline Depth Check in DomStrategy Multi-Worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Rewrite the `if (isDomStrategy)` fast path inside the `else { /* multi-worker */ }` branch to unroll the fast-submit condition into an inner `while` loop that eagerly grabs frames as long as there is pipeline depth.

```typescript
// Replace the current `while (!aborted)` block with:
while (!aborted && nextFrameToSubmit < totalFrames) {
    // Fast path: Eagerly submit frames until pipeline is full
    while (nextFrameToSubmit < totalFrames && nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth && !aborted) {
        const i = nextFrameToSubmit++;
        const ringIndex = i & ringMask;
        frameReadyRing[ringIndex] = 0;
        frameBufferRing[ringIndex] = null;

        try {
            const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
            if (timePromise) {
                await timePromise;
            }
            let buffer: any;
            buffer = await domBeginFrame!();
            frameBufferRing[ringIndex] = buffer;
            frameReadyRing[ringIndex] = 1;
        } catch (e) {
            fatalError = e;
            aborted = true;
            checkState();
        }
        writerWaiterPromise.resolve();
    }

    if (aborted || nextFrameToSubmit >= totalFrames) break;

    // Slow path: Wait for a spot in the pipeline
    freeWorkers[freeWorkersHead++] = workerIndex;
    checkState();
    const i = (await workerThenables[workerIndex] as any) as number;

    if (i === -1 || aborted) break;

    const ringIndex = i & ringMask;
    try {
        const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
        if (timePromise) {
            await timePromise;
        }
        let buffer: any;
        buffer = await domBeginFrame!();
        frameBufferRing[ringIndex] = buffer;
        frameReadyRing[ringIndex] = 1;
    } catch (e) {
        fatalError = e;
        aborted = true;
        checkState();
    }
    writerWaiterPromise.resolve();
}
```

### Step 2: Hoist Pipeline Depth Check in CanvasStrategy Multi-Worker
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the same structural unrolling and unswitching logic to the `else` (non-DomStrategy) block inside the multi-worker path.

## Correctness Check
Run the `npm run build -w packages/renderer` and then the standard benchmark to ensure no frames are dropped, and the pipeline continues to synchronize correctly.

## Variations
Variation A: Instead of duplicating the capture blocks, we could define an inline function `captureFrame(i: number)` within the `runWorker` scope. The Executor should measure whether the closure overhead outweighs the branching overhead.

## Prior Art
- PERF-822: Eliminate branch overhead in CaptureLoop hot paths.
- PERF-832: Hoist progress check in CaptureLoop single worker path.
