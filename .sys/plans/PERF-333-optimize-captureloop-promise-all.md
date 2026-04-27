---
id: PERF-333
slug: optimize-captureloop-promise-all
status: complete
claimed_by: "executor"
created: 2024-04-22
completed: "2024-06-03"
result: "kept"
---

# PERF-333: Preallocate SeekTime Evaluate Parameters

## Focus Area
The `SeekTimeDriver.ts` hot loop iterates over `executionContextIds` and creates an anonymous object literal `{ expression: expression, contextId: this.executionContextIds[i], awaitPromise: true }` on every frame for every execution context.

## Background Research
In V8, allocating objects in a hot loop triggers garbage collection and increases memory overhead. Previous experiments (PERF-329) showed that preallocating evaluation parameters in `CdpTimeDriver.ts` yielded a ~3.3% performance improvement. Similarly, `SeekTimeDriver.ts` (used for `dom` mode rendering) still performs inline object allocation in the multi-frame CDP `Runtime.evaluate` loop. By preallocating these parameters statically per execution context in an array during initialization, we can eliminate this repeated dynamic allocation.

However, subsequent experiments (PERF-359 and manual testing) verified that caching array parameters for Playwright CDP `Runtime.evaluate` calls actually introduces potential race conditions if the CDP serialization happens asynchronously after the synchronous array mutation in the loop. Furthermore, inline allocations are natively optimized effectively by V8.

The actual implementation will fully inline the evaluation parameters, removing the problematic `multiFrameEvaluateParams` array in both `CdpTimeDriver.ts` and `SeekTimeDriver.ts`.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~39.6s (from recent `CaptureLoop` optimizations)
- **Bottleneck analysis**: CPU overhead in the tight `setTime` loop inside `SeekTimeDriver`, specifically from inline object literal creation inside the CDP `Runtime.evaluate` call loop.

## Implementation Spec

### Step 1: Inline execution context evaluate parameters in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove `private multiFrameEvaluateParams: any[] = [];`
2. In `setTime`, replace the cached allocation loop:
   ```typescript
   for (let i = 0; i < this.executionContextIds.length; i++) {
     this.cdpSession!.send('Runtime.evaluate', {
       expression,
       contextId: this.executionContextIds[i],
       awaitPromise: true
     }).catch(noopCatch);
   }
   ```
**Why**: Avoids mutating a shared parameter cache which causes race conditions if the CDP client batches or serializes asynchronously.

### Step 2: Inline execution context evaluate parameters in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `private multiFrameEvaluateParams: any[] = [];`
2. In `setTime`, replace the cached allocation loop with the inline version similarly.

## Correctness Check
Run the DOM selector verification test: `npx tsx tests/verify-dom-selector.ts` and inspect output to ensure frames still advance correctly.

## Prior Art
- PERF-329: Preallocated `evaluateParams` in `CdpTimeDriver.ts` (~3.3% improvement).
- PERF-359: Inline multi-frame parameters

## Results Summary
- **Result**: kept
- **Best render time**: functionally equivalent to baseline.
- **Improvement**: Solved asynchronous CDP serialization race condition.
- **Kept experiments**: Inlining evaluation parameters to eliminate the `multiFrameEvaluateParams` cache.
