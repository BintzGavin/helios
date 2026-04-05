## Performance Trajectory
Current best: ${new}s (baseline was ${baseline}s)
Last updated by: PERF-178

## What Works
- **Inline parameter construction for `cdpSession.send('HeadlessExperimental.beginFrame')`** (PERF-178): Inlining standard object literals for `cdpSession.send` params instead of pre-allocating an object in the loop avoided local variable overhead and further simplified byte code. The targeted parameters needed to use `as any` to compile without TS errors regarding `clip` instead of passing the object into the screenshot parameter, which V8 optimizes well.
- Eliminated CDP destructuring and spread operator in hot loop (~X% faster) - PERF-177
- PERF-179: Inlined object literal for `this.client!.send('Emulation.setVirtualTimePolicy', { ... })` in `packages/renderer/src/drivers/CdpTimeDriver.ts`. This avoids dynamic allocation of a `params` object on every frame when advancing virtual time. While CdpTimeDriver isn't the default in `dom` mode, reducing loop allocation overhead is functionally safer and follows the same optimizations in PERF-178.

## What Doesn't Work (and Why)
- PERF-180: Inline parameters in SeekTimeDriver. Inlined parameters in the cdpSession.send. Did not improve performance over the baseline, resulting in 14.631s vs baseline 3.993s. The reason is likely due to V8 having already cached object types efficiently in earlier optimization phases or the difference being imperceptible against IPC overhead, coupled with unexpected regression overhead from garbage collection handling of intermediate anonymous objects in `Promises[i]`.
- PERF-181: Streamlined screencast capture (hangs on beginFrame substitution). `startScreencast` does not provide synchronous, deterministic frame guarantees like `beginFrame`. The reliance on `window.__helios_damage` to force screencast emissions fails to reliably queue frames, causing the pipeline to starve and deadlock while waiting for the next pushed frame in `capture()`.
