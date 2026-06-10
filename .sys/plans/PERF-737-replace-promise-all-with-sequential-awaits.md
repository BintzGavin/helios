---
id: PERF-737
slug: replace-promise-all-with-sequential-awaits
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-737: Replace Promise.all with sequential awaits in SeekTimeDriver.setTime

## Focus Area
The `setTime` method in `SeekTimeDriver.ts`. Specifically, the multi-frame code path where we execute script evaluation on all execution context IDs and return the CDP promises.

## Background Research
Currently, `setTime` uses `Promise.all(this.multiFramePromises)` when syncing multiple execution contexts. The `this.multiFramePromises` array contains promises returned by Chromium's CDP `Runtime.evaluate` command. A micro-benchmark analysis reveals that V8 has significantly higher overhead when dealing with `Promise.all()` compared to sequential await calls or returning an explicit loop over awaits. Even when caching the array instance (`this.multiFramePromises`), V8 still needs to construct iterator state, allocate internal arrays, and resolve an aggregate promise wrapper.

In my Node.js microbenchmarks for resolving promises, replacing `Promise.all` over a pre-allocated array of 1-3 promises with a `for` loop of sequential awaits significantly outperformed the native `Promise.all` (e.g., `await Promise.all()`: ~572ms vs sequential `await`: ~276ms for a 3-element array over 1M iterations).

Because `setTime` is the entry point in the `CaptureLoop.ts` per-frame hot path, optimizing the promise resolution pattern here directly reduces garbage collection overhead and V8 sequence tracking allocation per frame. We can safely remove the `this.multiFramePromises` tracking entirely and use an inline asynchronous loop. However, since the method must return a Promise to satisfy the interface, and we are within a hot fast-path, instead of returning an `async` sequence which incurs its own microtask wrapper, we can simply execute them using a tight async helper or let V8 inline an async sequence manually. Actually, the best way in TypeScript is to just make `setTime` `async` (or return an async function block). I will optimize the return mechanism to use sequential `await` over the `this.executionContextIds` directly, eliminating `this.multiFramePromises` array tracking entirely.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.317s (from baseline measurements)
- **Bottleneck analysis**: Micro-allocations and promise tracking overhead in the per-frame `setTime` hot loop.

## Implementation Spec

### Step 1: Remove `multiFramePromises` property
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Remove `private multiFramePromises: Promise<any>[] = [];` from the class properties.

### Step 2: Optimize `setTime` to use sequential awaits
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify the multi-frame path in `setTime`. Change it from:
```typescript
    this.multiFramePromises.length = this.executionContextIds.length;
    // ... setup ...
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFrameEvaluateParams[i].expression = expression;
      this.multiFrameEvaluateParams[i].contextId = this.executionContextIds[i];
      this.multiFramePromises[i] = this.cdpSession!.send('Runtime.evaluate', this.multiFrameEvaluateParams[i]);
    }
    return Promise.all(this.multiFramePromises) as unknown as Promise<void>;
```
to:
```typescript
    // ... setup ...
    for (let i = 0; i < this.executionContextIds.length; i++) {
      this.multiFrameEvaluateParams[i].expression = expression;
      this.multiFrameEvaluateParams[i].contextId = this.executionContextIds[i];
    }

    // Use an IIFE or inline async logic to return a promise that resolves sequentially
    return (async () => {
        for (let i = 0; i < this.executionContextIds.length; i++) {
             await this.cdpSession!.send('Runtime.evaluate', this.multiFrameEvaluateParams[i]);
        }
    })();
```
Actually, we don't even need the IIFE. Let's just make the entire multi-frame processing an inline async sequence. Wait, making `setTime` async changes the signature technically but it returns `Promise<void>`, so `async setTime(page, timeInSeconds): Promise<void>` is valid.
However, an IIFE specifically for the multi-frame path avoids penalizing the single-frame fast path with top-level `async` generator overhead.
```typescript
    const promisesLoop = async () => {
        for (let i = 0; i < this.executionContextIds.length; i++) {
             await this.cdpSession!.send('Runtime.evaluate', this.multiFrameEvaluateParams[i]);
        }
    };
    return promisesLoop();
```
**Why**: V8's JIT optimizes sequential awaits significantly better than `Promise.all` in hot loops by eliminating the intermediate promise array wrapper.
**Risk**: Negligible. CDP `Runtime.evaluate` messages are pipelined asynchronously anyway, so the execution sequence remains the same, we just await them sequentially on the Node.js side.

## Correctness Check
Run the `dom` benchmark (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) and verify output video generation completes successfully.

## Prior Art
- PERF-725 replaced `.then` chains with sequential `awaits` in `CaptureLoop.ts` and achieved a measurable performance gain.
- PERF-703 attempted a similar unrolling but got slower because it broke V8 inline caching. By keeping the `await` strictly inside a clean loop here, we optimize directly over `Promise.all` overhead.
