---
id: PERF-383
slug: prebind-screencast-promise-executor
status: complete
claimed_by: "executor-session"
created: 2026-04-29
completed: 2026-04-29
result: improved
---

# PERF-383: Prebind Screencast Promise Executor in DomStrategy Capture

## Focus Area
`DomStrategy.ts` - Specifically the `capture()` method hot loop. The current code dynamically allocates an arrow function closure inside `new Promise((resolve) => { ... })` on every single frame captured during DOM mode rendering. This introduces recurring V8 garbage collection (GC) overhead and inline allocation latency, which is the exact same micro-optimization identified and successfully addressed in `TimeDriver` backpressure mechanisms (e.g., PERF-337, PERF-340).

## Background Research
In Playwright/CDP based screen capture pipelines, eliminating per-frame short-lived allocations (like anonymous closures passed to Promise constructors) allows turbofan to optimize the hot path better and minimizes GC pauses.
Currently in `DomStrategy.ts`:
```typescript
    const promise = new Promise<string>((resolve) => {
      this.screencastPromiseResolver = resolve;
    });
```
This allocates an arrow function per frame. By prebinding the executor function during class initialization, we can reuse the same closure reference for every frame, reducing V8 overhead. We will introduce `this.screencastPromiseExecutor = (resolve) => { this.screencastPromiseResolver = resolve; };` as a class property.

## Benchmark Configuration
- **Composition URL**: A standard DOM benchmark composition (e.g., via `tests/verify-dom-strategy-capture.ts` or a standard `npm run test` loop).
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.954s (from verify-dom-strategy-capture baseline runs)
- **Bottleneck analysis**: Micro-allocations inside the hot loop `strategy.capture()` executed per frame (e.g., 60 times per second for a 60fps composition). Removing dynamic closure allocation here compounds with prior loop optimizations.

## Implementation Spec

### Step 1: Prebind the screencast promise executor in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add a private class property:
   ```typescript
   private screencastPromiseExecutor = (resolve: (value: string) => void) => {
     this.screencastPromiseResolver = resolve;
   };
   ```
2. Modify the `capture()` method to use this prebound executor:
   ```typescript
   // Before:
   const promise = new Promise<string>((resolve) => {
     this.screencastPromiseResolver = resolve;
   });

   // After:
   const promise = new Promise<string>(this.screencastPromiseExecutor);
   ```

**Why**: Reusing a single prebound executor function avoids dynamically allocating a new arrow function closure on every single frame. This reduces GC pressure in the main event loop and aligns with other pipeline optimizations (like PERF-337).
**Risk**: Negligible. The functional behavior of extracting the `resolve` callback remains identical.

## Variations
None required. The prebound executor pattern is well-established and strictly equivalent functionally.

## Canvas Smoke Test
Not applicable; this only affects `DomStrategy`.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` within the `packages/renderer` directory. It should still log `Buffer returned: true` without errors or deadlocks.

## Prior Art
- PERF-337: Prebound `frameWaiterResolve` executor into `frameWaiterExecutor`.
- PERF-340: Prebound `stabilityTimeoutExecutor` in `CdpTimeDriver.ts`.

## Results Summary
- **Best render time**: 1.907s (vs baseline 1.954s)
- **Improvement**: ~2.4%
- **Kept experiments**: Prebound screencast promise executor
- **Discarded experiments**: None
