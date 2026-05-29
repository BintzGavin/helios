---
id: PERF-617
slug: flatten-cdptimedriver-await
status: complete
claimed_by: ""
created: 2024-05-29
completed: ""
result: "discard"
---

# PERF-617: Flatten CdpTimeDriver Promise Chain into Native Await

## Focus Area
`CdpTimeDriver.ts` (`runSetTime` function): The hot loop that advances virtual time in the CDP driver. Specifically, optimizing the `virtualTimePromiseExecutor` promise chaining.

## Background Research
Currently in `CdpTimeDriver.ts`, the hot loop advances the headless Chromium compositor time by creating a `Promise` and chaining a `.then()` to update the local driver time state.
```typescript
    // 2. Advance virtual time
    this.setVirtualTimePolicyParams.budget = budget;
    return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
        this.currentTime = timeInSeconds;
    });
```
Recent performance experiments like `PERF-511` and `PERF-614` demonstrated that replacing chained `.then()` closures with sequential `await`s significantly reduces Promise allocation overhead and closure creation, improving performance. V8's native async/await state machine is often faster than dynamic promise chaining in highly predictable hot loops. By making `runSetTime` an `async` function and `await`ing the promise natively, we skip the `.then(() => ...)` closure allocation.

## Benchmark Configuration
- **Composition URL**: Extract exact standard settings from a previous successful `.sys/plans/PERF-*.md` file during execution.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s (from current best baseline in `docs/status/RENDERER-EXPERIMENTS.md` or earlier plan results).
- **Bottleneck analysis**: The `runSetTime` hot loop is executed per frame across all workers. Minimizing object/closure allocations in this tight loop is critical for shaving off milliseconds of V8 GC overhead across thousands of iterations.

## Implementation Spec

### Step 1: Flatten Await Chain in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `runSetTime` function, make the function `async` (it already returns `Promise<void>`), and replace the `.then` closure with an inline `await`.

Change the signature and return logic from:
```typescript
  private runSetTime(page: Page, timeInSeconds: number): Promise<void> {
    // ...
    // 2. Advance virtual time
    this.setVirtualTimePolicyParams.budget = budget;
    return new Promise<void>(this.virtualTimePromiseExecutor).then(() => {
        this.currentTime = timeInSeconds;
    });
  }
```
To:
```typescript
  private async runSetTime(page: Page, timeInSeconds: number): Promise<void> {
    // ...
    // 2. Advance virtual time
    this.setVirtualTimePolicyParams.budget = budget;
    await new Promise<void>(this.virtualTimePromiseExecutor);
    this.currentTime = timeInSeconds;
  }
```
Note: Ensure you update `if (delta <= 0) { return Promise.resolve(); }` to simply `return;` as well, since the function is now `async`.

**Why**: This change eliminates the closure `() => { this.currentTime = timeInSeconds; }` created on every frame, and leverages V8's highly optimized `async/await` state machine instead of manually chaining promises.

**Risk**: Negligible. The functional outcome is identical. If V8 handles `.then` chains faster than sequential `await`s in this specific context (as seen in some past experiments), performance might regress slightly, but historically in this project `await` has proven superior or equal.

## Variations
None needed.

## Canvas Smoke Test
Run a basic canvas render to ensure `CanvasStrategy` is not negatively impacted (though Canvas uses a different driver entirely).

## Correctness Check
Run the tests, specifically `npx tsx packages/renderer/tests/verify-cdp-determinism.ts`, to ensure virtual time advancement is still accurate and deterministic.

## Prior Art
- **PERF-511**: Inlined Begin Frame Await (`.then` to `await`), which significantly improved performance.
- **PERF-614**: Eliminated Capture Result Promise Allocation, moving to inline `try/catch`. This experiment naturally extends this paradigm to `CdpTimeDriver`.

## Results Summary
- **Best render time**: 2.079s (vs baseline 1.317s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [flatten cdptimedriver await]