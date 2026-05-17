---
id: PERF-536
slug: inline-stability-evaluate
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: "2026-05-17"
result: "discarded"
---

# PERF-536: Inline Stability Evaluate

## Focus Area
DOM Rendering phase 4: Frame Capture Loop (`CdpTimeDriver.ts`).

## Background Research
Currently, `CdpTimeDriver.ts` performs stability checks on every frame using `Runtime.evaluate` to call the user's `__helios_wait_until_stable` method. This check uses `awaitPromise: true`, and the driver then calls `this.handleStabilityCheckResponse(res)` if there is a response to check for exceptions. We can optimize this by avoiding the `if(res)` check and eliminating the function dispatch for `handleStabilityCheckResponse` by inlining the exception check directly in the `runSetTime` hot loop. We can also set `returnByValue: false` to avoid serializing the promise resolution.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.594s
- **Bottleneck analysis**: Overhead in the V8 execution hot loop around CDP promise allocations and function dispatch.

## Implementation Spec

### Step 1: Inline `handleStabilityCheckResponse` logic
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove the `handleStabilityCheckResponse` method, and inline its exception check directly into `runSetTime`. Additionally, make sure `returnByValue: false` in `evaluateStabilityParams` to minimize IPC payload overhead (which is already configured).

```typescript
<<<<<<< SEARCH
    if (this.stabilityCheckState === 1) {
      const res = await this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);
      if (res) {
        this.handleStabilityCheckResponse(res);
      }
    }
=======
    if (this.stabilityCheckState === 1) {
      const res = await this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);
      if (res && res.exceptionDetails) {
        throw new Error('Stability check failed: ' + res.exceptionDetails.exception?.description);
      }
    }
>>>>>>> REPLACE
```

```typescript
<<<<<<< SEARCH
  private handleStabilityCheckResponse = (res: any) => {
    if (res && res.exceptionDetails) {
      throw new Error('Stability check failed: ' + res.exceptionDetails.exception?.description);
    }
  };


  private handleVirtualTimeBudgetExpired = () => {
=======
  private handleVirtualTimeBudgetExpired = () => {
>>>>>>> REPLACE
```

**Why**: Removing function dispatch and wrapper allocations reduces micro-optimizable overhead in the high-frequency capture hot loop.
**Risk**: None.

## Correctness Check
Run the benchmark script (`npx tsx packages/renderer/tests/fixtures/benchmark.ts`) to measure speedups. Then run the full test suite (`npm run test -w packages/renderer -- --run`) to verify correctness and ensure no functionality is broken.

## Results Summary
- **Best render time**: 17.328s (vs baseline ~15.594s)
- **Improvement**: Regressed
- **Kept experiments**: []
- **Discarded experiments**: [Inline Stability Evaluate Exception check in CdpTimeDriver.ts]