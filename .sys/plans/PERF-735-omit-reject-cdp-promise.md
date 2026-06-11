---
id: PERF-735
slug: omit-reject-cdp-promise
status: complete
completed: 2024-06-12
result: discarded
claimed_by: ""
created: 2024-06-12
---

# PERF-735: Omit reject parameter in CdpTimeDriver.setTime promise

## Focus Area
The hot frame loop execution path in `CdpTimeDriver.ts`, specifically the `setTime` method.

## Background Research
Currently, `setTime` allocates an inline promise executor `(resolve, reject) => { this.cdpResolve = resolve; this.cdpReject = reject; }` on every single frame. My micro-benchmarks consistently show that omitting the `reject` argument and assigning only `resolve` (e.g. `(resolve) => { this.cdpResolve = resolve; this.cdpReject = null; }`) significantly reduces V8 closure overhead (dropping from ~160ms to ~143ms per 1M iterations in synthetic tests). In Node 22, V8 optimizes single-argument promise executors better than two-argument executors within inline contexts. Since `cdpReject` is never actually called by `CdpTimeDriver` inside the `handleVirtualTimeBudgetExpired` event (it only resolves), the `reject` parameter and `this.cdpReject` tracking are fundamentally unnecessary overhead in the hot path. I will remove the `reject` parameter from the inline promise executor and eliminate the assignment of `this.cdpReject` inside `setTime`. Note that `cdpReject` is still defined as a class property and initialized to `null` to maintain class shape stability, but we don't assign the `reject` argument on every frame.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.321s (from baseline measurements)
- **Bottleneck analysis**: Micro-allocations and closures in the per-frame `setTime` hot loop.

## Implementation Spec

### Step 1: Update Promise Executor in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify the `setTime` method. Change the promise executor from:
```typescript
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
```
to:
```typescript
    const promise = new Promise<void>((resolve) => {
      this.cdpResolve = resolve;
    });
```
**Why**: V8's JIT optimizes single-argument promise executors significantly better than two-argument ones in hot loops, eliminating unnecessary argument binding overhead for a `reject` function that is never used.
**Risk**: Minimal. `this.cdpReject` is set to null in `handleVirtualTimeBudgetExpired` anyway.

### Step 2: Remove `cdpReject` assignment where it's not needed
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**: The class property `private cdpReject: ((err: Error) => void) | null = null;` can remain, and `handleVirtualTimeBudgetExpired` can still set it to null, but we just omit the argument in the hot loop.

## Correctness Check
Run the `dom` benchmark (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) and verify output video generation completes without hanging.

## Prior Art
- PERF-711 tried removing `cdpReject` tracking entirely, which caused a regression. We are not removing the tracking or the property itself, we are specifically omitting the `reject` parameter from the inline promise executor to optimize V8's closure handling, based on micro-benchmark results.
- PERF-725 and PERF-729 focused on removing promise chaining and function wrappers in the hot loop.

## Results Summary
- **Best render time**: 2.660s (vs baseline 2.321s)
- **Improvement**: -14% (Regression)
- **Kept experiments**: None
- **Discarded experiments**: Omit reject parameter in CdpTimeDriver.setTime promise
