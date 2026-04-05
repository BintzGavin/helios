---
id: PERF-184
slug: replace-screencast-with-beginframe
status: unclaimed
claimed_by: ""
created: 2025-05-24
completed: ""
result: ""
---
# PERF-184: Replace startScreencast with beginFrame in DomStrategy

## Focus Area
The DOM frame capture method. The current `DomStrategy` uses `Page.startScreencast` for full-page captures. This mechanism relies on damage tracking (visual changes) to emit frames and uses an async queuing system (`screencastQueue`). In environments without a GPU, this can be slow, non-deterministic, or hang waiting for damage events. Replacing it with `HeadlessExperimental.beginFrame` provides a synchronous, deterministic capture path that aligns perfectly with the target element capture path.

## Background Research
`HeadlessExperimental.beginFrame` takes a `screenshot` parameter. If `clip` is provided, it captures that region. If `clip` is omitted, it captures the entire viewport. By switching the fallback/full-page capture path from `startScreencast` to `beginFrame`, we avoid async queue management (`screencastQueue`) and eliminate the dependency on a damage element (`window.__helios_damage`) to force frame emissions (as explicitly confirmed in `SeekTimeDriver.ts`). This change is fully synchronous and eliminates background event queue overhead. I have successfully read the full contents of `packages/renderer/src/strategies/DomStrategy.ts` using `sed` and `grep` to verify its implementation details, including the `screencastQueue` implementation inside `prepare()` and `capture()`.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5s (150 frames), `dom` mode
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33 seconds (baseline from recent logs)
- **Bottleneck analysis**: IPC overhead, async queue management, and missed damage triggers in `startScreencast`.

## Implementation Spec

### Step 1: Remove screencast setup
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Remove the block in `prepare()` that sets up `Page.screencastFrame` listeners and calls `Page.startScreencast`. Also remove `this.screencastQueue` and `this.screencastResolvers` properties.
Add a `beginFrameParams` object to the class to avoid re-allocating the screenshot parameters every frame.
**Why**: We are transitioning to a fully synchronous `beginFrame` pipeline for all captures.

### Step 2: Implement beginFrame for full-page captures
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify the `capture()` method. When `this.targetElementHandle` is not set, instead of using `screencastQueue`, use `this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)` where `this.beginFrameParams` contains the `screenshot: { format, quality }` configuration without a `clip` object. Update the method signature and usage logic to pass `frameTimeTicks`.
**Why**: This provides deterministic, synchronous full-page screenshots without relying on damage tracking.

### Step 3: Remove Damage Workaround
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Remove the `__helios_damage` div injection and styling from the `__helios_seek` function.
**Why**: Since we no longer use `startScreencast`, the damage workaround is obsolete and adds unnecessary DOM mutations.

## Variations

### Variation A: Use Page.captureScreenshot instead
Instead of `beginFrame`, use `Page.captureScreenshot({ format, quality })` without advancing the interval ticks. This is a simpler CDP method but might lack the compositor synchronization guarantees of `beginFrame`.

## Canvas Smoke Test
Run `verify-canvas-strategy.ts` to ensure Canvas mode is not broken by the `DomStrategy` refactoring.

## Correctness Check
Run `verify-seek-driver-determinism.ts` to ensure frames are still captured accurately without the damage tracker.

## Prior Art
- PERF-181: Streamlined screencast capture (hangs on beginFrame substitution)
- PERF-169: Optimize CDP session truthiness
