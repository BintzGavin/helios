---
id: PERF-329
slug: preallocate-evaluate-params
status: unclaimed
claimed_by: ""
created: 2024-05-29
completed: ""
result: ""
---

# PERF-329: Preallocate Evaluate Params

## Focus Area
DOM Rendering Pipeline - Frame Capture Loop Hot Path in `CdpTimeDriver.ts`.

## Background Research
In `packages/renderer/src/drivers/CdpTimeDriver.ts`, the hot path `setTime` currently creates inline literal object allocations for each frame when synchronizing media: `{ expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");" }` for single-frame setups, and `{ expression: expression, contextId: this.executionContextIds[i], awaitPromise: false }` when handling multiple execution contexts via `Promise.all`. It also allocates `{ expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true }` for the stability check.

While previous attempts to avoid object allocations (PERF-301, PERF-302) for the simple stability check were deemed inconclusive due to V8 optimization, testing the preallocation of `evaluateParams` across all execution contexts inside the media synchronization loop may yield different results by reducing GC pressure and memory churn, especially when multiple parameters (`expression`, `contextId`, `awaitPromise`) are involved dynamically across multiple iframes per tick. We can test this by mutating properties on a cached class member object rather than using inline literal allocation.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: Baseline identical settings across all runs, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.8s
- **Bottleneck analysis**: Micro-allocations inside the hot loop `setTime` trigger minor garbage collections, which disrupt V8 optimization and take CPU time away from Playwright IPC and frame processing.

## Implementation Spec

### Step 1: Preallocate Evaluate Params
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add the following to the class properties:
```typescript
  private evaluateParams: any = { expression: '', awaitPromise: false };
  private evaluateStabilityParams: any = { expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true };
```

In `setTime()`, instead of passing inline objects to `Runtime.evaluate`, mutate `this.evaluateParams.expression` and (optionally) `this.evaluateParams.contextId` and pass `this.evaluateParams` and `this.evaluateStabilityParams` directly.

Specifically:
- Replace `{ expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");" }` with `this.evaluateParams.expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"; this.evaluateParams.contextId = undefined;` and pass `this.evaluateParams`.
- Inside the loop, replace `{ expression: expression, contextId: this.executionContextIds[i], awaitPromise: false }` with `this.evaluateParams.expression = expression; this.evaluateParams.contextId = this.executionContextIds[i];` and pass `this.evaluateParams`.
- For the stability check, replace `{ expression: "if (typeof window.__helios_wait_until_stable === 'function') window.__helios_wait_until_stable();", awaitPromise: true }` with `this.evaluateStabilityParams`.

**Why**: Avoids allocating a new object on every frame and per execution context, allowing V8 to reuse the static objects and reduce GC pressure.
**Risk**: Negligible. The logic is functionally identical.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't affected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure the DOM strategy logic runs and correctly falls back to the mocked `lastFrameData` buffer.
