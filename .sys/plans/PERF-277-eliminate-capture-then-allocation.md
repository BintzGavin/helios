---
id: PERF-277
slug: eliminate-capture-then-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-31
completed: ""
result: ""
---

# PERF-277: Eliminate Promise `.then` Allocation in DomStrategy Capture

## Focus Area
The hot frame generation pipeline in `DomStrategy.ts`. Specifically, the dynamic allocation of a Promise `.then()` wrapper on every frame capture.

## Background Research
In `DomStrategy.ts`, the `capture()` method invokes the CDP command `HeadlessExperimental.beginFrame` which returns a Promise. To format the raw CDP response into a usable Buffer/string, the method currently chains a `.then(this.handleBeginFrameResult)`.
While `this.handleBeginFrameResult` is a pre-bound class property (avoiding closure allocation), V8 still allocates a new Promise object for the `.then()` chain on every single frame. This contributes to microtask queue depth and garbage collection pressure in the hot loop.
By returning the raw CDP Promise directly from `capture()` and introducing a synchronous `formatResponse()` step in `CaptureLoop.ts` (which is executed *after* the `await` resolution), we can completely eliminate this per-frame Promise allocation.

## Benchmark Configuration
- **Composition URL**: `file://.../output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: `1280x720`, `30fps`, `3 seconds`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.143s
- **Bottleneck analysis**: Microtask and Promise object allocation overhead during CDP frame requests.

## Implementation Spec

### Step 1: Update RenderStrategy Interface
**File**: `packages/renderer/src/strategies/RenderStrategy.ts`
**What to change**:
Add an optional synchronous method `formatResponse?(rawRes: any): Buffer | string;` to the interface.

### Step 2: Remove `.then()` Allocation in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Change `capture()` to return the raw `Promise<any>` without chaining `.then(this.handleBeginFrameResult)`.
2. Rename `handleBeginFrameResult` to `formatResponse(res: any): Buffer | string`. Handle the fallback screenshot logic similarly in this synchronous method.

### Step 3: Apply Synchronous Formatting in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `run()`, locate the await step:
```typescript
        const rawRes = await framePromises[nextFrameToWrite & ringMask]!;
```
Retrieve the worker for the current frame from `contextRing` and synchronously format the response:
```typescript
        const workerForFrame = contextRing[nextFrameToWrite & ringMask].worker;
        const buffer = workerForFrame.strategy.formatResponse ? workerForFrame.strategy.formatResponse(rawRes) : rawRes;
```

## Canvas Smoke Test
Verify Canvas strategy remains unaffected since `formatResponse` is optional and Canvas returns a Buffer natively.

## Correctness Check
Run the DOM benchmark and inspect the output video to verify visual correctness.
