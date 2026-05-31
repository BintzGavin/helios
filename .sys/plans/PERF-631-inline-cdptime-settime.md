---
id: PERF-631
slug: inline-cdptime-settime
status: unclaimed
claimed_by: ""
created: 2024-05-31
completed: ""
result: ""
---
# PERF-631: Inline CdpTimeDriver setTime allocation

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - specifically the hot loop methods `setTime`, `runSetTime`, and `defaultSyncMedia`.

## Background Research
The `setTime` function is called for every single frame within the `CaptureLoop.ts` writer. Currently, `setTime` acts as a pass-through wrapper to `runSetTime`. Eliminating the private method and inlining `runSetTime` logic into `setTime` directly removes an unnecessary function call overhead from the hot loop.
Additionally, when `delta <= 0` (which is rare but happens during duplicate frame handling), `setTime` implicitly returns a `Promise.resolve()` allocation by returning `void` inside a wrapper that expects a `Promise<void> | void`. Modifying the logic to return synchronously without any allocation saves microtasks.
Furthermore, within `defaultSyncMedia()`, the static string assignment `this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media();";` evaluates every frame when `frames.length === 1`. This static property is already initialized and assigned correctly during `prepare()`, making the per-frame reassignment completely redundant.

## Benchmark Configuration
- **Composition URL**: file:///app/examples/dom-benchmark/output/example-build/composition.html
- **Render Settings**: 600x600, 30 FPS, 5s duration, mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s (optimized)
- **Bottleneck analysis**: V8 garbage collection and function invocation overhead in the `setTime` hot loop and property reassignments inside `defaultSyncMedia`.

## Implementation Spec

### Step 1: Inline `runSetTime` into `setTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the private `runSetTime(page: Page, timeInSeconds: number): Promise<void>` method.
2. Move its entire body into `setTime(page: Page, timeInSeconds: number): Promise<void> | void`.
3. In `setTime`, ensure `if (delta <= 0) { return; }` correctly returns synchronously (void) instead of allocating a Promise.
**Why**: Saves one function invocation frame and possible Promise allocation per rendered frame in the hot loop.
**Risk**: Function signature in interface `TimeDriver` must match `Promise<void> | void`.

### Step 2: Remove redundant string assignment in `defaultSyncMedia`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `private defaultSyncMedia()`, locate the branch `if (frames.length === 1) {`.
Remove the line: `this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media();";`
The expression is already set accurately during initialization and never mutates for the single-frame case.
**Why**: Avoids writing to an object property unnecessarily every frame, saving minor V8 property lookup/mutation overhead.
**Risk**: If `prepare()` is bypassed or modified in the future to change this expression, it would be stale. However, this is heavily static.

## Variations
No variations planned.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure these changes do not break the fallback canvas mechanism, though `CdpTimeDriver` is specific to DOM.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-determinism.ts` to verify DOM output correctly halts and waits for the time to finish before advancing the compositor.

## Prior Art
- PERF-630 and PERF-612 optimizations attempted to clean up hot loop variables but missed these specific redundant allocations and function wrapper layers.
