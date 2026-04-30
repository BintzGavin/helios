---
id: PERF-391
slug: cache-evaluate-params-seek
status: unclaimed
claimed_by: ""
created: 2024-04-30
completed: ""
result: ""
---
# PERF-391: Preallocate `evaluateParams` object literal in `SeekTimeDriver`

## Focus Area
The single-frame and multi-frame hot paths in `SeekTimeDriver.setTime()`.

## Background Research
In PERF-388, we successfully reduced V8 GC pressure in `CdpTimeDriver.ts` by caching the `evaluateParams` object literal and modifying its `expression` property inline, rather than allocating a new `{ expression: ..., awaitPromise: true }` object on every frame.

Currently, `SeekTimeDriver.ts` does exactly what `CdpTimeDriver` used to do:
```typescript
    if (frames.length === 1) {
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }) as unknown as Promise<void>;
    }
```
A new object is allocated on the heap for every frame.

While an earlier experiment (PERF-350) attempted to inline parameters instead of caching and mutating them, it reported worse performance. But PERF-388 proved that *caching* an object and *mutating* it is faster than inline allocation. Specifically, in `CdpTimeDriver.ts`, PERF-388 did exactly this for the media sync path.

Wait, PERF-350 stated: "Inlined object allocation for `Runtime.evaluate` params in `SeekTimeDriver`'s `setTime` hot loop instead of caching and mutating them, but it performed slightly worse (-3.66%) due to the overhead of setting up inline params on every single execution frame when evaluating script strings. (PERF-350)".

Actually, if we look closely at PERF-350, it says caching and mutating was BETTER than inlined object allocation. Wait, if caching and mutating is better, but right now the code has inline allocation (`{ expression: ... }`), it means PERF-350 reverted back to caching and mutating? No, let's look at the actual code in `SeekTimeDriver`:
```typescript
    if (frames.length === 1) {
      return this.cdpSession!.send('Runtime.evaluate', {
        expression: 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')',
        awaitPromise: true
      }) as unknown as Promise<void>;
    }
```
This is inline allocation! Which means it currently allocating objects every frame. If caching is better, we should cache it.

Wait, looking at PERF-351: "Attempted to inline multiFrameEvaluateParams array and replace Promise.race allocation... The median render time regressed to ~48.5s... Similar to PERF-350, creating new object literals inside the SeekTimeDriver hot loop and doing complex manual Promise allocations in the browser context adds more overhead than the write barriers caused by mutating the long-lived properties. Discarded as slower."
So PERF-350 and PERF-351 both concluded that mutating cached properties is *faster* than creating new object literals, BUT they were discarded because they tried to *remove* the cache and use inline objects instead. So the cache was faster, but wait, the current code is using inline objects!

Let me verify `SeekTimeDriver.ts`. Yes, it's using an inline object literal `{ expression: ..., awaitPromise: true }`. Let's cache it.

## Benchmark Configuration
- **Composition URL**: `scripts/benchmark-concurrent.ts` or similar DOM test.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Implementation Spec

### Step 1: Pre-allocate Evaluate Params
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add a class property: `private singleFrameEvaluateParams: any = { expression: '', awaitPromise: true };`
2. In `setTime`, change the `frames.length === 1` block:
```typescript
    if (frames.length === 1) {
      this.singleFrameEvaluateParams.expression = 'window.__helios_seek(' + timeInSeconds + ', ' + this.timeout + ')';
      return this.cdpSession!.send('Runtime.evaluate', this.singleFrameEvaluateParams) as unknown as Promise<void>;
    }
```
**Why**: Avoids dynamically allocating a new `{ expression: ..., awaitPromise: true }` object on every single frame in the hot loop.

### Step 2: Handle multi-frame (Optional)
The multi-frame path already allocates `{ expression, contextId, awaitPromise }`. Wait, if we use a single object, we can't share it across multiple async `Runtime.evaluate` calls because Playwright CDP is async and modifying a shared object might cause race conditions (as we saw in PERF-333/PERF-327). So we leave multi-frame as inline allocation, or we allocate an array of objects.
Let's just optimize the single-frame path, which is the 99% use case.

## Correctness Check
Run `tests/verify-dom-media-preload.ts` and `tests/verify-seek-driver-stability.ts`.
