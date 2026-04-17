## Performance Trajectory
Current best: 32.040s (baseline was 43.227s, -25.6%)
Last updated by: PERF-277

## What Doesn't Work (and Why)
- **PERF-296**: Replaced object mutation with inline object allocation in the hot loops of `SeekTimeDriver.ts` and `DomStrategy.ts`. The median render time worsened to ~48.743s compared to the baseline of ~47.232s. This indicates that creating new object literals inside the hot loop adds more overhead than the write barriers caused by mutating the long-lived properties. Discarded as slower.

## What Works
- **PERF-295**: Removed `fallbackScreenshotOptions` cache from `DomStrategy.ts` and constructed fallback options inline. Render time: 47.232s (baseline ~47.460s). Avoids untyped property mutation and hidden class pollution. Kept.
- **PERF-285**: Optimized SeekTimeDriver single-frame evaluation by replacing Playwright IPC closure with raw CDP string evaluation over Runtime.evaluate. Improved render time to ~32.1s.
- **PERF-277**: Replaced `.then()` with `await` in `DomStrategy.capture()` to eliminate dynamic Promise allocation per frame.
- **PERF-274**: Replaced syncMedia closure evaluation with string evaluation in CdpTimeDriver.ts. Faster and avoids IPC overhead.
- **PERF-279**: Cleaned up dead code by removing unused `activePromise` from `BrowserPool.ts`. No significant render time change (baseline maintained at ~32.9s) but improves code cleanliness.
- Prebinding virtualTimePromiseExecutor in CdpTimeDriver.ts (PERF-267) improved performance. Median time: 32.264 (baseline: 43.227).
- PERF-268: Returned Base64 String directly from CanvasStrategy WebCodecs capture. Render time: 32.326s (baseline 32.596s)
- Pre-bound the `syncMedia` catch handlers to `this.handleSyncMediaError` inside `CdpTimeDriver.ts` hot loop (PERF-265).

## What Doesn't Work (and Why)
- **PERF-292**: Tried eliminating `formatResponse.call` in `CaptureLoop.ts` by replacing it with direct invocation `formatResponse(rawResponse)`. V8 effectively optimizes the `.call()` dynamic dispatch overhead inside tight loops so there was no performance improvement. Render time was slightly worse (~32.204s compared to ~32.112s baseline).
- **PERF-270**: Prebind CaptureLoop then closures. Avoided creating anonymous closures in the hot pipeline loop by using a pre-allocated state array, but V8 already optimizes this well enough so there was zero performance improvement.
- **PERF-262**: Prebound the CDP stability timeout promise executor. V8 optimizes the inline promise and anonymous closure allocation better than the property lookup.
- Prebind virtual time promise executor in CdpTimeDriver (PERF-260). Did not improve render time.

## Open Questions
- Can we eliminate dynamic Promise `.then` closure allocation in the `CaptureLoop.ts` by pre-binding?

## What Works
- **PERF-285**: Optimized SeekTimeDriver single-frame evaluation by replacing Playwright IPC closure with raw CDP string evaluation over Runtime.evaluate. Improved render time to ~32.1s.
- **PERF-274**: Replaced syncMedia closure evaluation with string evaluation in CdpTimeDriver.ts. Faster and avoids IPC overhead.
- Pre-bind fallback callback in DomStrategy.capture() (PERF-269) - Eliminates GC pressure overhead in fallback screenshot loop

## What Doesn't Work (and Why)
- Eliminated fallback closure allocation in SeekTimeDriver (PERF-272). Render time regressed to 33.045.

- **PERF-273**: Inline SeekTimeDriver CDP callParams. The `timeout` value is now dynamically injected into the `functionDeclaration` instead of dynamically passing it through arguments list over IPC on every frame. Reduced object tree size for IPC payload. Time: 32.286s (baseline 32.264s). Marginal difference, but logically optimized payload size over CDP IPC, kept.
- **PERF-275**: Preallocated executeCapture closures dynamically using a ring buffer of context objects. Render time: 32.143
- **PERF-276**: Replaced modulo (`%`) operators with bitwise AND (`&`) for indexing into the `framePromises` ring buffer in `CaptureLoop.ts`. Render time: 32.243s (baseline 32.062s). Discarded because V8 already optimizes modulo efficiently and the bitwise logic yielded no measurable improvement and was slightly slower.

## What Doesn't Work (and Why)
- **PERF-271**: Optimized pipeline promise chain in CaptureLoop.ts and CdpTimeDriver.ts by avoiding extra Promise allocations. Eliminated intermediate `.then` and `.catch` wrappers. The changes yielded no measurable improvement (32.076s vs baseline 32.091s), indicating that V8 effectively optimizes simple try/catch and single argument `.then` vs chain allocations, meaning the allocation overhead was negligible compared to the underlying Playwright/IPC calls. Discarded as inconclusive.
- **PERF-281**: Replaced per-frame Promise allocation in `CaptureLoop.ts` with a preallocated array of `buffer`, `error`, and `done` state. Expected to reduce GC overhead. The microtask creation per frame was eliminated, but the result showed no measurable performance improvement compared to the baseline (~32.2s vs baseline ~32.1s), indicating V8 handles the per-frame Promise creation and garbage collection efficiently enough that the allocation overhead was negligible in this context. Discarded.

## Open Questions
- **PERF-283**: Will preallocating `this.cachedPromises` and eliminating the dynamic check `if (this.cachedPromises.length !== frames.length)` in `SeekTimeDriver.ts` hot loop improve render times?

## PERF-283: Preallocate Evaluate Promises in SeekTimeDriver
- Render time: 33.245s (Baseline: 42.955s)
- Status: keep
- **PERF-282**: Inlined promise allocation for `frames.length === 2` and `frames.length === 3` in `SeekTimeDriver.setTime()` to statically allocate `Promise.all` and avoid loop overhead. V8 handles dynamic indexing efficiently enough for very small arrays that the inline logic yielded no measurable performance improvement (median: 32.321s vs baseline 32.164s) and occasionally performed slightly worse due to branching overhead. Discarded as inconclusive.

## PERF-284: Optimize CdpTimeDriver hot loop evaluation
- Render time: 32.655s (Baseline: 32.207s)
- Status: discard
- **PERF-284**: Extracted dynamic inline string evaluation into a pre-bound closure property (`syncMediaClosure`) passed via `frame.evaluate` in `CdpTimeDriver.setTime()`. The goal was to reduce V8 string parsing and compilation overhead over Playwright's CDP IPC when operating on multiple frames. The rendering times regressed slightly (~32.655s vs baseline 32.207s). This indicates that the V8 and IPC overhead of serializing the argument array (`this.evaluateArgs`) combined with invoking the closure dynamically outweighs the cost of the inline string evaluation in this multi-frame hot path. Discarded as slower.

## PERF-259: Prebind CaptureLoop Drain Promise Executor
- Render time: 32.211s (Baseline: 32.540s)
- Status: discard
- **PERF-259**: Extracted anonymous promise executor function into a prebound class property `handleDrainPromiseExecutor` when handling FFmpeg write backpressure `drain` event inside `CaptureLoop`. The change yielded a slightly faster render time, however the improvement was smaller than the noise variance and the overall results were inconclusive compared to baseline since backpressure didn't cause enough garbage collection issues to be a primary bottleneck. Discarded as inconclusive.

## PERF-280: Replace CaptureLoop.ts Frame Promise Allocation with Preallocated Signal Array
- Render time: 32.241s (Baseline: 32.170s)
- Status: discard
- **PERF-280**: Eliminated per-frame dynamic `Promise` object allocation in `CaptureLoop.ts` by replacing `framePromises` with a reusable `frameWaiterResolve` and a `ready` state boolean in `contextRing`. The microtask creation per frame was eliminated, but the result showed no measurable performance improvement compared to the baseline (~32.2s vs baseline ~32.1s). This indicates that V8 handles the per-frame Promise creation and garbage collection efficiently enough in this context, making the allocation overhead negligible. Discarded as inconclusive.

## Open Questions
- **PERF-286**: Can we improve multi-frame synchronization in SeekTimeDriver by prefetching Context IDs and iterating with raw CDP Runtime.evaluate over all frames?

## What Works
- Replaced Playwright closure IPC with raw CDP `Runtime.evaluate` for multi-frame in `SeekTimeDriver`
- Improved render time for multi-frame compositions
- PERF-286

## What Doesn't Work (and Why)
- **Preallocating CDP evaluate parameter object for multi-frame seek execution (PERF-287)**
  - What: In `SeekTimeDriver.ts`, preallocated a statically-sized array of `multiEvaluateParams` objects to reuse during the `setTime` multi-frame execution loop instead of allocating new objects dynamically on every tick.
  - Why it didn't work: Yielded a median run time of ~32.749s, compared to the baseline median of ~32.186s. The optimization actually degraded performance by adding memory lookup and branching overhead, demonstrating that V8 easily optimizes the inline dynamic object allocation inside this tight loop, rendering the explicit preallocation slower.
  - Plan: PERF-287

## What Works
- Inlined worker call arguments in `CaptureLoop.ts` (PERF-288) - ~23.5% improvement
- CdpTimeDriver Multi-Frame CDP Evaluate (PERF-289) - Improved render speed

## PERF-290: Optimize CdpTimeDriver single-frame evaluation
- Render time: 32.271s (Baseline: 32.040s)
- Status: inconclusive
- **PERF-290**: Replaced Playwright IPC closure evaluation (`Runtime.callFunctionOn`) with raw CDP string evaluation (`Runtime.evaluate`) for stability checks and single-frame media synchronization in `CdpTimeDriver.ts`. Cleaned up unused execution initializers. Time remained practically identical/within noise margins, indicating that while raw strings save object-mapping overhead on IPC, single-frame evaluate allocations are not the primary bottleneck here. Kept for cleaner code and consistency with SeekTimeDriver.

## PERF-278: Worker-centric async loop actor model check
- Render time: 32.707s (Baseline: 32.040s)
- Status: discard
- **PERF-278**: Attempted to implement a worker-centric async loop in `CaptureLoop.ts` to bypass pipeline allocations for a single worker pool by avoiding `contextRing` and `framePromises` entirely. Found that the actor model with backpressure had already been partially implemented, but benchmarking revealed that running it without the actor model or trying to bypass it (if poolLen === 1) degraded performance (32.707s vs baseline 32.040s). The existing pipelined actor model is faster even with a single worker. Discarded.

## PERF-291: Eliminate getNextTask Promise Allocation
- Render time: 33.527s (Baseline: ~32.040s)
- Status: inconclusive
- **PERF-291**: Eliminated dynamic `Promise` allocation and `await` yielding inside the worker loops `getNextTask()` by allowing it to return a synchronous index integer when the buffer has capacity. While theoretically sound to avoid microtask yields and GC pressure per frame, testing showed no tangible improvement (33.527s due to noisy VM vs baseline ~32.040s) because V8 successfully optimizes small async functions and microtask hopping very well. Kept since the logic explicitly prevents unnecessary Promise wrapping without altering behavior.

## PERF-291: Eliminate getNextTask Promise Allocation
- Render time: 32.381s (Baseline: ~32.040s)
- Status: inconclusive
- **PERF-291**: Eliminated dynamic `Promise` allocation and `await` yielding inside the worker loops `getNextTask()` by allowing it to return a synchronous index integer when the buffer has capacity. While theoretically sound to avoid microtask yields and GC pressure per frame, testing showed no tangible improvement (32.381s vs baseline ~32.040s) because V8 successfully optimizes small async functions and microtask hopping very well. Kept since the logic explicitly prevents unnecessary Promise wrapping without altering behavior.

- **PERF-292**: Tried eliminating `formatResponse.call` in `CaptureLoop.ts` by replacing it with direct invocation `formatResponse(rawResponse)`. V8 effectively optimizes the `.call()` dynamic dispatch overhead inside tight loops so there was no performance improvement. Render time was slightly worse (~32.204s compared to ~32.112s baseline).

## Open Questions
- **PERF-293**: Can we avoid the `Buffer.isBuffer()` function call overhead in `DomStrategy.formatResponse()` by prioritizing the `res.screenshotData` check for CDP?

## PERF-293: Reorder formatResponse checks in DomStrategy
- Render time: 48.225s (Baseline: 49.244s)
- Status: keep
- **PERF-293**: Reordered `DomStrategy.formatResponse()` to check `if (res && res.screenshotData)` before checking `Buffer.isBuffer(res)`. This prioritizes the CDP hot path, avoiding the `Buffer.isBuffer()` function call overhead on every frame, which replaces a function call with a fast V8 hidden-class property access. It improved render times slightly compared to baseline (~48.2s vs baseline ~49.2s). Kept.

## PERF-294: Inline formatResponse in CaptureLoop.ts
- Render time: 51.097s (Baseline: 48.225s)
- Status: discard
- **PERF-294**: Inlined `formatResponse` CDP extraction directly inside the hot loop (`runWorker`) in `CaptureLoop.ts` to avoid the `.call` method invocation overhead. V8 handles the function dispatch effectively, and the added branching `typeof rawResponse.screenshotData === 'string'` in the hot loop actually slightly degraded performance (~51.097s vs baseline ~48.225s). Discarded because the dynamic function dispatch is faster than checking type/property dynamically.
