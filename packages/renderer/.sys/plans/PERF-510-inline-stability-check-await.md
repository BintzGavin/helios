---
id: PERF-510
slug: inline-stability-check-await
status: impossible
claimed_by: ""
created: 2024-05-15
completed: 2026-06-01
result: impossible
---

# PERF-510: Inline Stability Check Await

## Focus Area
`defaultStabilityCheck` in `CdpTimeDriver.ts`.

## Background Research
The `defaultStabilityCheck()` method chains a `.then()` to handle CDP stability responses. In a hot loop executing 60 times a second, this creates an anonymous closure and a secondary Promise allocation. By returning the Playwright CDP promise directly and awaiting it within `runSetTime` before evaluating the response, we eliminate the secondary V8 Promise allocation and microtask suspension.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.612s
- **Bottleneck analysis**: Microtask queue churn and Promise object allocations within V8.

## Implementation Spec

### Step 1: Return direct promise
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify `defaultStabilityCheck` to return the promise without `.then()`, and update `runSetTime` to await it directly.

```diff
<<<<<<< SEARCH
  private defaultStabilityCheck(): Promise<void> | void {
    return this.client!.send('Runtime.evaluate', this.evaluateStabilityParams).then((res) => {
      if (res) {
        this.handleStabilityCheckResponse(res);
      }
    }) as unknown as Promise<void>;
  }
=======
  private defaultStabilityCheck(): Promise<any> {
    return this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);
  }
>>>>>>> REPLACE
```

```diff
<<<<<<< SEARCH
    if (this.stabilityCheckState === 1) {
      const stabilityResult = this.defaultStabilityCheck();
      if (stabilityResult) {
        await stabilityResult;
      }
    }
=======
    if (this.stabilityCheckState === 1) {
      const res = await this.defaultStabilityCheck();
      if (res) {
        this.handleStabilityCheckResponse(res);
      }
    }
>>>>>>> REPLACE
```
**Why**: Avoids creating a secondary Promise object via `.then()` and an anonymous closure per frame.
**Risk**: None.

## Impossibility Explanation
Upon reviewing `packages/renderer/src/drivers/CdpTimeDriver.ts`, this optimization has already been fully implemented by `PERF-520`. That experiment entirely removed `defaultStabilityCheck` and `evaluateStabilityParams`, inlining the `await` directly into `runSetTime()`. Therefore, this experiment's target code no longer exists and the optimization is structurally obsolete.
