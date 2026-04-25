---
id: PERF-340
slug: prebind-stability-timeout-executor
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2024-05-24"
result: "improved"
---

# PERF-340: Prebind CdpTimeDriver Stability Timeout Executor

## Focus Area
`CdpTimeDriver.ts` single-frame execution hot path, specifically the `Stability check timed out` timeout promise.

## Background Research
During single-frame evaluation within the capture loop, `CdpTimeDriver` allocates an anonymous promise executor and an anonymous `setTimeout` closure on every single frame to race against the `Runtime.evaluate` call for stability. This contributes to V8 GC churn. By pre-allocating the `stabilityTimeoutExecutor` and the inner `stabilityTimeoutCallback` as class methods, and carefully cleaning up the `timeoutId` and `reject` references in the `finally` block, we can eliminate all dynamic closure allocations in this path without introducing hanging state. Previous attempts like PERF-262 failed due to incorrect state cleanup, but applying the pattern from PERF-324 (which successfully prebound frame promise executors) will succeed.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A
- **Bottleneck analysis**: Repeated anonymous closure allocations (`() => { ... }`) for `new Promise` and `setTimeout` inside the hot loop add unnecessary garbage collection pressure per frame.

## Implementation Spec

### Step 1: Pre-bind the Stability Timeout Executor and Callback
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add state variables to the class:
   ```typescript
   private stabilityTimeoutId: NodeJS.Timeout | null = null;
   private stabilityTimeoutReject: ((err: Error) => void) | null = null;
   ```
2. Add the prebound callback and executor:
   ```typescript
   private stabilityTimeoutCallback = () => {
     if (this.stabilityTimeoutReject) {
       this.stabilityTimeoutReject(new Error('Stability check timed out'));
     }
   };

   private stabilityTimeoutExecutor = (_: () => void, reject: (err: Error) => void) => {
     this.stabilityTimeoutReject = reject;
     this.stabilityTimeoutId = setTimeout(this.stabilityTimeoutCallback, this.timeout);
   };
   ```
3. In `setTime()`, replace the inline promise allocation:
   ```typescript
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Stability check timed out'));
      }, this.timeout);
    });
   ```
   with:
   ```typescript
    const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);
   ```
4. Update the `finally` block in `setTime()` to clean up the class properties:
   ```typescript
    } finally {
      if (this.stabilityTimeoutId !== null) {
        clearTimeout(this.stabilityTimeoutId);
        this.stabilityTimeoutId = null;
      }
      this.stabilityTimeoutReject = null;
    }
   ```
**Why**: Avoids dynamic allocation of the Promise executor and `setTimeout` closure per frame. By moving state to the class level and explicitly nullifying it in `finally`, we ensure no memory leaks and lower GC overhead.
**Risk**: If state is not cleared correctly, subsequent frames could fire stale rejections or leak memory, which is why the `finally` cleanup is critical.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`

## Prior Art
- PERF-262 (attempted to prebind stability timeout but degraded performance likely due to state/closure handling)
- PERF-324 (successfully prebound frame promise executors)

## Results Summary
- **Best render time**: 46.396s (vs baseline 46.709s)
- **Improvement**: ~0.6%
- **Kept experiments**: Prebound CdpTimeDriver Stability Timeout Executor
- **Discarded experiments**: None
