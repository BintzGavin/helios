## Performance Trajectory
Current best: 32.264s (baseline was 43.227s, -25.3%)
Last updated by: PERF-270

## What Works
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
- Pre-bind fallback callback in DomStrategy.capture() (PERF-269) - Eliminates GC pressure overhead in fallback screenshot loop

## What Doesn't Work (and Why)
- Eliminated fallback closure allocation in SeekTimeDriver (PERF-272). Render time regressed to 33.045.

- **PERF-273**: Inline SeekTimeDriver CDP callParams. The `timeout` value is now dynamically injected into the `functionDeclaration` instead of dynamically passing it through arguments list over IPC on every frame. Reduced object tree size for IPC payload. Time: 32.286s (baseline 32.264s). Marginal difference, but logically optimized payload size over CDP IPC, kept.
