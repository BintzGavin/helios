---
id: PERF-704
slug: omit-catch-noopcatch-sync-media
status: complete
claimed_by: "executor-session"
created: 2024-06-08
completed: "2026-06-16"
result: failed
---
# PERF-704: Omit .catch(noopCatch) in defaultSyncMedia

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - Specifically, the `defaultSyncMedia` method which is called in the hot path on every frame when media is present.

## Background Research
In the current `CdpTimeDriver.ts`, if `this.hasMedia` is true, the `runSetTime` method calls `this.defaultSyncMedia()`. Inside `defaultSyncMedia`, the code dispatches CDP messages via `this.client!.send('Runtime.evaluate', ...).catch(noopCatch);`.
Since Playwright's `send` method returns a Promise, appending `.catch(noopCatch)` forces V8 to allocate a new Promise and a new microtask closure for every single frame (and for every execution context if there are multiple frames/iframes).
In a previous experiment, removing the `.catch` from the `Emulation.setVirtualTimePolicy` call improved performance by eliminating this exact type of per-frame promise chain overhead. The same principle applies here. An unhandled rejection on CDP communication during capture is a fatal error anyway and should correctly crash the process or be handled by Playwright's top-level event handlers.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/
- **Render Settings**: 1920x1080, 60fps, 120 frames (2 seconds)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.571s
- **Bottleneck analysis**: Microtask and Promise closure allocation in the hot loop (specifically inside `CdpTimeDriver.ts`).

## Implementation Spec

### Step 1: Remove `.catch(noopCatch)` in `defaultSyncMedia`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Locate the `defaultSyncMedia` method.
Remove the `.catch(noopCatch)` from all three `this.client!.send('Runtime.evaluate', ...)` calls within this method.
Additionally, you can remove the `noopCatch` function definition at the top of the file since it will no longer be used.

**Why**: This prevents V8 from allocating a chained Promise and enqueuing a `.catch` callback microtask on every single frame, directly reducing garbage collection pressure and CPU overhead in the tight frame capture loop.
**Risk**: If a non-fatal CDP error occurs during media sync, it might result in an `UnhandledPromiseRejection` and crash the process. However, in an ephemeral renderer VM context, a failure in the CDP connection during capture is generally unrecoverable anyway, making a crash the correct fail-fast behavior.

## Canvas Smoke Test
Run a simple Canvas test (e.g., `npm run test:canvas -w packages/renderer`) to verify that the canvas strategy still works, as changes to `CdpTimeDriver` might affect shared driver logic.

## Correctness Check
Verify that the output video (`packages/renderer/output/dom-benchmark.mp4`) still plays correctly and has the expected duration and content.

## Prior Art
- Eliminating `.catch` handlers on ephemeral CDP calls has been proven to reduce promise allocation overhead in tight loops.

## Results Summary
- **Best render time**: N/A
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-704: Code targeted by plan already matches the desired state (no `.catch(noopCatch)` present in `defaultSyncMedia`).]
