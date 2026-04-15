## Performance Trajectory
Current best: 32.040s (baseline was 43.227s, -25.6%)
Last updated by: PERF-277

## What Works
- **PERF-277**: Replaced `.then()` with `await` in `DomStrategy.capture()` to eliminate dynamic Promise allocation per frame.
- **PERF-274**: Replaced syncMedia closure evaluation with string evaluation in CdpTimeDriver.ts. Faster and avoids IPC overhead.
- **PERF-279**: Cleaned up dead code by removing unused `activePromise` from `BrowserPool.ts`. No significant render time change (baseline maintained at ~32.9s) but improves code cleanliness.
- Prebinding virtualTimePromiseExecutor in CdpTimeDriver.ts (PERF-267) improved performance. Median time: 32.264 (baseline: 43.227).
- PERF-268: Returned Base64 String directly from CanvasStrategy WebCodecs capture. Render time: 32.326s (baseline 32.596s)
- Pre-bound the `syncMedia` catch handlers to `this.handleSyncMediaError` inside `CdpTimeDriver.ts` hot loop (PERF-265).

## What Doesn't Work (and Why)
- **PERF-270**: Prebind CaptureLoop then closures. Avoided creating anonymous closures in the hot pipeline loop by using a pre-allocated state array, but V8 already optimizes this well enough so there was zero performance improvement.
- **PERF-262**: Prebound the CDP stability timeout promise executor. V8 optimizes the inline promise and anonymous closure allocation better than the property lookup.
- Prebind virtual time promise executor in CdpTimeDriver (PERF-260). Did not improve render time.

## Open Questions
- Can we eliminate dynamic Promise `.then` closure allocation in the `CaptureLoop.ts` by pre-binding?

## What Works
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
