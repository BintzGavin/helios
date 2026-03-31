---
id: PERF-125
slug: eliminate-try-catch-hot-loop
status: unclaimed
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---
# PERF-125: Eliminate Try-Catch Overhead in Hot Loop `processWorkerFrame`

## Focus Area
The hot frame capture loop in `packages/renderer/src/Renderer.ts`.

## Background Research
Inside `Renderer.ts`, the `processWorkerFrame` function runs asynchronously for every single frame (e.g., thousands of times per render). It is currently defined as:

```typescript
const processWorkerFrame = async (worker: any, compositionTimeInSeconds: number, time: number) => {
    try {
        await worker.activePromise;
    } catch (e) {
        // Ignore previous errors to allow chain to continue (or abort)
    }
    const setTimePromise = worker.timeDriver.setTime(worker.page, compositionTimeInSeconds);
    ...
```

The V8 JavaScript engine's optimizing compiler (TurboFan) sometimes de-optimizes or generates heavier bail-out code for async functions containing `try-catch` blocks, especially when they are invoked iteratively in extremely hot loops. Furthermore, wrapping the awaited promise in a try-catch incurs additional execution context allocation on every frame tick.

Since we just want to safely await the previous frame's completion and suppress any rejection from breaking the current continuation, we can achieve identical functionality with significantly less overhead by appending `.catch(() => {})` directly to the promise instead of using a `try-catch` block.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture (`output/example-build/examples/simple-animation/composition.html`)
- **Render Settings**: 1280x720, dom mode, 30fps
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s
- **Bottleneck analysis**: Micro-stalls caused by try-catch execution context allocation in the hottest path of the V8 JavaScript frame generator.

## Implementation Spec

### Step 1: Remove try-catch block from `processWorkerFrame`
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Locate the `processWorkerFrame` function inside `captureLoop`.
2. Replace the `try { await worker.activePromise; } catch (e) {}` block with a single `.catch()` continuation:
   ```typescript
   await worker.activePromise.catch(() => {});
   ```
**Why**: This reduces the bytecode footprint and execution context allocation inside the hot loop, avoiding any potential V8 de-optimizations related to try-catch blocks and resulting in a cleaner, faster async function invocation per frame.

## Correctness Check
Run the renderer benchmark to ensure frames are successfully produced and the program doesn't crash on completion.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to execute verification tests for Canvas strategy.
