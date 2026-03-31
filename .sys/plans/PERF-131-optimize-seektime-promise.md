---
id: PERF-131
slug: optimize-seektime-promise
status: unclaimed
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---
# PERF-131: Optimize single-frame `setTime` in `SeekTimeDriver` by removing unnecessary `async/await` overhead

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts`, specifically the `setTime` function, which is on the hot path for every single frame capture.

## Background Research
The `setTime` method in `SeekTimeDriver` handles syncing the composition time for all frames (iframes + main frame) on the Playwright page.
Currently, it checks `if (frames.length === 1)` (which is the case for most simple compositions).
Inside that block, it uses `await` to evaluate the CDP session or frame. For multi-frame evaluation, it maps promises into an array and does `await Promise.all(promises)`.

By completely removing the `async` keyword from the `setTime` method signature and removing `await` when evaluating promises (returning the constructed promises directly), we can avoid the generator and context switching overhead for every frame in the hot loop. The `setTime` method is already defined in the `TimeDriver` interface to return a `Promise<void>`, so returning a promise chain or `Promise.all` directly is semantically identical.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: IPC latency and promise resolution overhead in the hot loop. Removing unnecessary `await` steps on the hot path reduces V8 GC pressure and event loop delays.

## Implementation Spec

### Step 1: Refactor `setTime` to return promises directly in the single-frame fast path
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Remove the `async` keyword from `async setTime(page: Page, timeInSeconds: number): Promise<void>`.
In the `if (frames.length === 1)` fast path, remove the `await` keyword before `this.cdpSession.send` and `frames[0].evaluate` and `return` those promises directly. Ensure `.then()` callbacks are used to push back to the `evaluateParamsPool` pool and throw `exceptionDetails` as was previously done sequentially after the `await`.
Also, in the fallback path for `frames.length > 1`, return the `Promise.all(promises)` instead of `await Promise.all(promises)`.

**Why**: By returning the promise directly, we avoid the overhead of pausing and resuming the async function context. This follows the same optimization applied in PERF-128 / PERF-129 to `processWorkerFrame`.
**Risk**: Very low. The execution timing remains identical.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify DOM rendering succeeds.
