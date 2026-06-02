---
id: PERF-458
slug: skip-media-sync-evaluate
status: complete
claimed_by: "executor-session"
created: 2024-06-03
completed: "2024-06-03"
result: "failed"
---

# PERF-458: Bypass Runtime.evaluate in CdpTimeDriver When No Media Exists

## Focus Area
`CdpTimeDriver.ts` inside the hot loop (`runSetTime`).

## Background Research
Currently, `CdpTimeDriver` executes a fire-and-forget `Runtime.evaluate` call on every frame to invoke `window.__helios_sync_media`, regardless of whether there are any media elements on the page. This incurs IPC overhead for purely DOM/Canvas compositions.

We will implement the closure-assignment approach. By conditionally assigning the `syncMediaFn` property once during the driver's initialization, we eliminate the `Runtime.evaluate` IPC overhead on every frame for compositions lacking media, without adding any conditional branches to the hot loop (`runSetTime`).

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html` (contains no media elements)
- **Render Settings**: 600x600, 30fps, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.595s
- **Bottleneck analysis**: Unnecessary `Runtime.evaluate` IPC overhead for non-media compositions.

## Implementation Spec

### Step 1: Conditionally define the media sync execution path
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private property `syncMediaFn = () => {};` to the `CdpTimeDriver` class.
2. In `init`, if `this.hasMedia` is true, assign `this.syncMediaFn = this.defaultSyncMedia;`.
3. Update `runSetTime` to call `this.syncMediaFn();` instead of `if (this.hasMedia) { this.defaultSyncMedia(); }`. Wait, we can just pre-bind defaultSyncMedia and avoid the if statement.
Let's actually just assign `this.syncMediaFn = () => this.defaultSyncMedia();` or keep the `if` statement.
Actually, in JS engines, calling a closure is sometimes faster than an `if` statement. Let's try replacing `if (this.hasMedia) { this.defaultSyncMedia(); }` with a direct call to `this.syncMediaFn()`.

Wait, the plan says:
1. Add `private syncMediaFn: () => void = () => {};`
2. At the end of `prepare`, if `this.hasMedia`, `this.syncMediaFn = () => this.defaultSyncMedia();`
3. In `runSetTime`, replace `if (this.hasMedia) { this.defaultSyncMedia(); }` with `this.syncMediaFn();`.

## Results Summary
- **Best render time**: 3.045s (vs baseline 2.595s)
- **Improvement**: -17.34%
- **Kept experiments**: none
- **Discarded experiments**: PERF-458: Bypass Runtime.evaluate in CdpTimeDriver When No Media Exists
