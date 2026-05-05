---
id: PERF-438
slug: eliminate-try-catch-cdptimedriver
status: unclaimed
claimed_by: ""
created: 2026-05-06
completed: ""
result: ""
---

# PERF-438: Eliminate try/catch in CdpTimeDriver Stability Check

## Focus Area
`CdpTimeDriver.ts` stability check loop.

## Background Research
In `CdpTimeDriver.ts`, the `runSetTime` method wraps the `Promise.race([evaluatePromise, timeoutPromise])` in an `await` within a `try/catch/finally` block. Inside the hot loop, a `try/catch` surrounding an `await` introduces overhead by forcing V8 to allocate exception handlers on the call stack and manage the async state machine. By removing the `try/catch/finally` and attaching native `.catch()` and `.finally()` handlers to the promise returned by `Promise.race`, we can streamline the async execution path and reduce the overhead in the hot loop. A similar optimization (PERF-395) successfully removed a `try/catch` block in `DomStrategy.ts`.

## Benchmark Configuration
- **Composition URL**: Standard benchmark
- **Render Settings**: 1280x720, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.776s
- **Bottleneck analysis**: Micro-overhead from V8 async state machine exception handling during the per-frame stability check.

## Implementation Spec

### Step 1: Replace `try/catch/finally` with native Promise chain in `CdpTimeDriver`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `CdpTimeDriver`, create class-bound handlers:
```typescript
  private handleStabilityRaceSuccess = (res: any) => {
    if (res) {
        this.handleStabilityCheckResponse(res);
    }
  };

  private handleStabilityRaceError = (e: any) => {
    if (e.message === 'Stability check timed out') {
        console.warn(`[CdpTimeDriver] Stability check timed out after ${this.timeout}ms. Terminating execution.`);
        try {
            this.client?.send('Runtime.terminateExecution').catch(() => {});
        } catch (termErr) {
            console.warn('[CdpTimeDriver] Failed to terminate hanging script (might have finished race):', termErr);
        }
    } else {
        throw e;
    }
  };

  private handleStabilityRaceFinally = () => {
    if (this.stabilityTimeoutId !== null) {
        clearTimeout(this.stabilityTimeoutId);
        this.stabilityTimeoutId = null;
    }
    this.stabilityTimeoutReject = null;
  };
```

Update `runSetTime` to return the promise chain natively:
```typescript
    const evaluatePromise = this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);
    const timeoutPromise = new Promise<void>(this.stabilityTimeoutExecutor);

    return Promise.race([evaluatePromise, timeoutPromise])
        .then(this.handleStabilityRaceSuccess)
        .catch(this.handleStabilityRaceError)
        .finally(this.handleStabilityRaceFinally) as unknown as Promise<void>;
```
*(Remove the `try { const res = await Promise.race... } catch ... finally ...` block).*

**Why**: Natively chaining promises removes an intermediate async/await suspension frame and local catch block context allocation inside V8.
**Risk**: Very low, changes only control flow syntax for the identical logical steps.

## Variations
None.

## Canvas Smoke Test
Run a standard benchmark tests.

## Correctness Check
Run the verification suite.

## Prior Art
PERF-395 in `DomStrategy.ts` and `PERF-432`.
