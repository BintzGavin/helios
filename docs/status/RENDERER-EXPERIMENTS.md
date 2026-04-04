## Performance Trajectory
Current best: ${new}s (baseline was ${baseline}s)
Last updated by: PERF-178

## What Works
- **Inline parameter construction for `cdpSession.send('HeadlessExperimental.beginFrame')`** (PERF-178): Inlining standard object literals for `cdpSession.send` params instead of pre-allocating an object in the loop avoided local variable overhead and further simplified byte code. The targeted parameters needed to use `as any` to compile without TS errors regarding `clip` instead of passing the object into the screenshot parameter, which V8 optimizes well.
- Eliminated CDP destructuring and spread operator in hot loop (~X% faster) - PERF-177


## What Works
- PERF-179: Inlined object literal for `this.client!.send('Emulation.setVirtualTimePolicy', { ... })` in `packages/renderer/src/drivers/CdpTimeDriver.ts`. This avoids dynamic allocation of a `params` object on every frame when advancing virtual time. While CdpTimeDriver isn't the default in `dom` mode, reducing loop allocation overhead is functionally safer and follows the same optimizations in PERF-178.
