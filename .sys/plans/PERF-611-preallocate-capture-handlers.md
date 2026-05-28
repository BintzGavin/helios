---
id: PERF-611
slug: preallocate-capture-handlers
status: complete
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-611: Pre-allocate Capture Handlers in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Closure allocations in `packages/renderer/src/core/CaptureLoop.ts` hot loop.

## Background Research
In `CaptureLoop.ts`, the `runWorker` hot loop uses a `.then(onFulfilled, onRejected)` chain to handle `captureResult`.
```typescript
            if (captureResult instanceof Promise) {
                await captureResult.then(
                    (buffer) => {
                        frameBufferRing[ringIndex] = buffer;
                        frameReadyRing[ringIndex] = 1;
                    },
                    (e) => {
                        frameErrorRing[ringIndex] = e;
                        frameReadyRing[ringIndex] = 1;
                    }
                );
            }
```
This inline closure allocates a new function object on the V8 heap for every frame iteration, capturing the `ringIndex` variable. Over 600 frames, this creates significant garbage collection pressure.
While PERF-604 attempted to replace this with native `await` and `try/catch`, it caused a regression because V8's async generator overhead outweighed the closure allocation.
We can achieve the best of both worlds by **pre-allocating** the fulfillment and rejection handlers. Since `ringIndex` is strictly bounded between `0` and `maxPipelineDepth - 1`, we can create an array of handler functions upfront. The hot loop then simply references `onFulfilledHandlers[ringIndex]`, entirely bypassing closure allocation per frame while retaining the heavily optimized `.then()` pipeline.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.404s
- **Bottleneck analysis**: Microtask and closure allocation overhead inside the `runWorker` hot loop.

## Implementation Spec

### Step 1: Pre-allocate handlers
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Instruct the executor to explore `packages/renderer/src/core/CaptureLoop.ts` to locate the `maxPipelineDepth` variable and `runWorker` function.
Right before the `runWorker` definition, allocate the arrays based on `maxPipelineDepth`:
```typescript
    const onFulfilledHandlers = new Array(maxPipelineDepth);
    const onRejectedHandlers = new Array(maxPipelineDepth);
    for (let j = 0; j < maxPipelineDepth; j++) {
        onFulfilledHandlers[j] = (buffer: any) => {
            frameBufferRing[j] = buffer;
            frameReadyRing[j] = 1;
        };
        onRejectedHandlers[j] = (e: any) => {
            frameErrorRing[j] = e;
            frameReadyRing[j] = 1;
        };
    }
```

### Step 2: Use pre-allocated handlers in `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the inline `.then()` callbacks in `runWorker` with the pre-allocated handlers:
```typescript
            if (captureResult instanceof Promise) {
                await captureResult.then(
                    onFulfilledHandlers[ringIndex],
                    onRejectedHandlers[ringIndex]
                );
            } else {
```

**Why**: Eliminates closure allocation on every frame capture, reducing V8 GC pressure without altering the optimal Promise resolution mechanics.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts` to verify correctness and ensure no unhandled promise rejections occur.
