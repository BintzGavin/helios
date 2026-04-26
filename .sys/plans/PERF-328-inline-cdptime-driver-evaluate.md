---
id: PERF-328
slug: inline-cdptime-driver-evaluate
status: complete
claimed_by: "executor"
created: 2024-05-28
completed: "2024-05-28"
result: "discard"
---

# PERF-328: Inline CdpTimeDriver Evaluate Params

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `CdpTimeDriver.ts`.

## Background Research
In `packages/renderer/src/drivers/CdpTimeDriver.ts`, the hot path `setTime` currently creates inline literal object allocations for each frame when synchronizing media: `{ expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");" }` for single-frame setups, and `{ expression: expression, contextId: this.executionContextIds[i], awaitPromise: false }` when handling multiple execution contexts via `Promise.all`. It also allocates `{ expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true }` for the stability check.

While previous attempts to avoid object allocations (PERF-302) for single-frame setups showed that V8 optimizations negated any benefits of caching properties on dynamic strings, preallocating the entire static `evaluateParams` configuration object, mutating only the string properties, and passing it across the multi-frame loop can reduce GC churn significantly over long timelines.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: Baseline identical settings across all runs, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A
- **Bottleneck analysis**: Object allocations inside the hot loop `setTime` trigger garbage collection sweeps, which consume CPU cycles.

## Implementation Spec

### Step 1: Preallocate Evaluate Params
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add the following to the class properties:
\`\`\`typescript
  private evaluateParams: any = { expression: '', awaitPromise: false };
  private evaluateStabilityParams: any = { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true };
\`\`\`

In `setTime()`, instead of passing inline objects to `Runtime.evaluate`, mutate `this.evaluateParams.expression` and (optionally) `this.evaluateParams.contextId` and pass `this.evaluateParams` and `this.evaluateStabilityParams` directly.

Specifically:
- Replace `{ expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");" }` with `this.evaluateParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"; this.evaluateParams.contextId = undefined;` and pass `this.evaluateParams`.
- Inside the loop, replace `{ expression: expression, contextId: this.executionContextIds[i], awaitPromise: false }` with `this.evaluateParams.expression = expression; this.evaluateParams.contextId = this.executionContextIds[i];` and pass `this.evaluateParams`.
- For the stability check, replace `{ expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true }` with `this.evaluateStabilityParams`.

**Why**: Avoids allocating a new object on every frame and per execution context, allowing V8 to reuse the static objects and reduce GC pressure.
**Risk**: V8 is efficient at inline dynamic object allocation, this may regress performance (PERF-302).

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't affected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure the DOM strategy logic runs and correctly falls back to the mocked `lastFrameData` buffer.

## Results Summary
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	61.065	600	9.83	33.2	discard	Inlined CdpTimeDriver evaluate params
2	49.584	600	12.10	42.4	discard	Inlined CdpTimeDriver evaluate params
3	47.811	600	12.55	37.2	discard	Inlined CdpTimeDriver evaluate params
4	47.439	600	12.65	43.7	discard	Inlined CdpTimeDriver evaluate params
