---
id: PERF-277
slug: eliminate-capture-then-allocation
status: unclaimed
claimed_by: ""
created: 2026-04-14
completed: ""
result: ""
---

# PERF-277: Eliminate Promise `.then` Allocation in DomStrategy Capture

## Focus Area
The hot frame generation pipeline in `DomStrategy.ts`. Specifically, the dynamic allocation of a Promise `.then()` wrapper on every frame capture inside the `capture()` method.

## Background Research
In `DomStrategy.ts`, the `capture()` method is declared as `async` and awaits the CDP command `HeadlessExperimental.beginFrame`, then immediately formats the result. This `await` creates an implicit Promise chain that allocates intermediate Promise objects per frame. By returning the raw CDP Promise directly from `capture()` without `await`, and shifting the synchronous formatting into `CaptureLoop.ts` (which already awaits the frame capture promise), we eliminate this per-frame allocation, reducing GC pressure.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.540s
- **Bottleneck analysis**: Promise object allocation overhead during CDP frame requests contributes to GC pauses and microtask queue depth.

## Implementation Spec

### Step 1: Update RenderStrategy Interface
**File**: `packages/renderer/src/strategies/RenderStrategy.ts`
**What to change**:
Update the `capture` method signature to return `Promise<any>`.
Add an optional synchronous method `formatResponse?(rawRes: any): Buffer | string;` to the interface.

### Step 2: Remove `.then()` Allocation in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Change `capture(page: Page, frameTime: number)` to return `Promise<any>`, and remove the `async` keyword to prevent implicit promise wrapping.
2. Return the raw Promise directly from `this.cdpSession!.send(...)` and `this.targetElementHandle.screenshot(...)` without `await`.
3. Combine `handleBeginFrameResult` and `handleFallbackScreenshot` into a single synchronous method `formatResponse(res: any): Buffer | string`. Inside `formatResponse`, if `res` is a Buffer (from fallback screenshot), return it; if `res` has `screenshotData`, return it; otherwise return `this.emptyImageBase64`.

### Step 3: Apply Synchronous Formatting in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the worker execution logic where `strategy.capture()` is called, the result should be awaited. Immediately after awaiting the raw response from `capture`, invoke the optional `formatResponse` method on the strategy (if it exists) to synchronously format the raw result into a Buffer or string before resolving the context.

## Canvas Smoke Test
Verify Canvas strategy remains unaffected since `formatResponse` is optional and Canvas returns a Buffer natively. Update `CanvasStrategy.ts` capture signature to `Promise<any>` if necessary.

## Correctness Check
Run the DOM benchmark (`cd packages/renderer && npx tsx scripts/benchmark-test.js`) and inspect the output video to verify visual correctness.
