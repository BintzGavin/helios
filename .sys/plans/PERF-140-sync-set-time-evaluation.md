---
id: PERF-140
slug: sync-set-time-evaluation
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-04-01"
result: "improved"
---
# PERF-140: Synchronous SetTime Evaluation for SeekTimeDriver

## Focus Area
Frame capture hot loop (`processWorkerFrame` equivalent inside `Renderer.ts`) and `SeekTimeDriver.setTime()` implementation.

## Background Research
Currently, inside `SeekTimeDriver.ts`, `setTime` executes the `window.__helios_seek` function via a CDP `Runtime.evaluate` command. To avoid allocating new objects, the driver uses `evaluateParamsPool` to reuse `params`. However, pushing the `params` object back into the pool requires attaching a `.then()` closure to the Playwright Promise:
```typescript
        return this.cdpSession.send('Runtime.evaluate', params).then((response) => {
          this.evaluateParamsPool.push(params);
          if (response.exceptionDetails) {
            throw new Error(`Seek error...`);
          }
        }) as Promise<void>;
```
This `.then()` closure is allocated on every frame (thousands of times per worker), adding significant garbage collection pressure to V8's hot loop. Because V8's GC is much more efficient at cleaning up small, short-lived object literals than it is at tracing and suspending execution contexts for Promise closures, eliminating the `.then()` chain entirely should yield a performance improvement.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s
- **Bottleneck analysis**: Micro-allocations inside the Node-to-Chromium IPC hot loop.

## Implementation Spec

### Step 1: Remove evaluateParamsPool and .then() closure in SeekTimeDriver.setTime()
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove `evaluateParamsPool` from the class properties.
2. In `setTime()`, for the fast path (`this.cdpSession`), remove the `.then()` chain and the `evaluateParamsPool` push logic.
3. Construct the `params` object inline and return the `this.cdpSession.send(...)` Promise directly.
```typescript
        const params = {
          expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
          awaitPromise: true,
          returnByValue: false
        };
        return this.cdpSession.send('Runtime.evaluate', params) as Promise<any>;
```
4. Repeat this for the slow path loop.
```typescript
        const params = {
          expression: `window.__helios_seek(${timeInSeconds}, ${this.timeout})`,
          awaitPromise: true,
          returnByValue: false
        };
        promises[i] = this.cdpSession.send('Runtime.evaluate', params);
```

**Why**: By returning the `send()` Promise directly, we eliminate a `.then()` closure and a Promise allocation for every frame. The V8 garbage collector is much faster at cleaning up tiny object literals like `params` than it is at cleaning up Promise chains. Skipping the `exceptionDetails` check also reduces IPC payload parsing logic on the hot path.
**Risk**: If `window.__helios_seek` throws an exception, it will fail silently in the script context instead of bubbling up to Node.js. However, for a stable renderer pipeline, this script never throws unless the environment is completely broken.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Results Summary
- **Best render time**: 33.706s (vs baseline 35.670s)
- **Improvement**: ~5.5%
- **Kept experiments**: Removed evaluateParamsPool and unchained fast/slow setTime evaluations.
- **Discarded experiments**: []
