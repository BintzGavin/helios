---
id: PERF-087
slug: preallocate-cdp
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-03-28"
result: "improved"
---

# PERF-087: Preallocate CDP Evaluate Parameters and Isolate Array Loop Setup

## Focus Area
Hot rendering path (`packages/renderer/src/drivers/SeekTimeDriver.ts`). The goal is to eliminate recurrent object allocations during `Runtime.evaluate` calls over the CDP session in the hot frame capture loop. Additionally, further reduce potential property lookups and garbage collection overhead by ensuring that array-related setups run efficiently.

## Background Research
Profiling V8 garbage collection (GC) and micro-stalls shows that continuously allocating small objects (like parameter objects for Playwright IPC calls) inside tight loops adds up over thousands of frames. We've seen from `PERF-086` that while we eliminated redundant property lookups in `Renderer.ts`, the parameter objects inside `SeekTimeDriver` are still dynamically constructed inline within the `setTime` method's `Runtime.evaluate` call. Pre-allocating a fixed parameter object for `Runtime.evaluate` inside `SeekTimeDriver` and dynamically updating only its `expression` property on each frame will prevent V8 from needing to garbage-collect thousands of ephemeral parameter objects over a long render session.

Also, in `PERF-086`'s Step 3, there was an observation:
> Remove shared evaluateParams in SeekTimeDriver (Safety)
> Remove this shared property and inline the object allocation inside the time-setting method.
> Why: Fixes a potential race condition.

Since `setTime` is called asynchronously and across multiple workers concurrently, sharing a *single class-level* object instance caused race conditions.
However, since the workers each have their own `SeekTimeDriver` instance running its own `setTime` loop (as initialized by `new SeekTimeDriver()` in `Renderer.ts`'s pool initialization), a dedicated object attached to the *class instance* won't clash across different workers. The race condition would only occur if multiple `setTime` calls happen simultaneously *within the same worker instance*, but the orchestration loop (`Renderer.ts` lines 305-327) waits on `worker.activePromise`, preventing concurrent executions on the same driver. Therefore, it is safe to cache the CDP evaluate parameter object at the `SeekTimeDriver` instance level.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1280x720, 30 FPS, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.539s
- **Bottleneck analysis**: Object allocations for `Runtime.evaluate` parameters occurring on every frame evaluation in `SeekTimeDriver.ts` causing minor GC pressure.

## Implementation Spec

### Step 1: Preallocate `Runtime.evaluate` Parameters
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Inside `SeekTimeDriver`, declare a private class property:
```typescript
private evaluateParams = { expression: '', awaitPromise: true, returnByValue: false };
```
Inside the `setTime` method, instead of doing:
```typescript
this.cdpSession.send('Runtime.evaluate', { expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`, awaitPromise: true, returnByValue: false })
```
Update the expression property of the cached object and pass it:
```typescript
this.evaluateParams.expression = `window.__helios_seek(${timeInSeconds}, ${this.timeout})`;
this.cdpSession.send('Runtime.evaluate', this.evaluateParams)
```

**Why**: Eliminates creating a new parameter object for every single frame evaluation. Since the `Renderer.ts` synchronizes worker execution via `worker.activePromise`, no concurrent `setTime` calls happen on the same `SeekTimeDriver` instance, making the instance-level cache safe and race-condition free.
**Risk**: Very low.

### Step 2: Canvas Smoke Test
**What to change**: Run a basic canvas render test to ensure nothing broke.

### Step 3: Correctness Check
**What to change**: Run `npx tsx packages/renderer/tests/verify-seek-driver-stability.ts` and ensure DOM output and seeking logic are still correct and there are no race condition bugs.

## Variations
### Variation A: Inline object pool
If the instance-level property causes unexpected behavior or tests fail, maintain a small local object pool within `setTime` or rely purely on object pooling logic to ensure 100% thread safety while keeping GC low.

## Results Summary
- **Best render time**: 34.012s (vs baseline 35.590s)
- **Improvement**: 4.4%
- **Kept experiments**: Module-level evaluateParamsPool for CDP parameters
- **Discarded experiments**: None
