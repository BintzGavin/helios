---
id: PERF-707
slug: disable-runtime-enable
status: complete
claimed_by: "executor"
created: 2024-05-18
completed: ""
result: ""
---

# PERF-707: Disable Runtime.enable when no media elements are present

## Focus Area
`CdpTimeDriver.ts` in `packages/renderer`. Specifically, the CDP communication overhead during `prepare()`.

## Background Research
In `packages/renderer/src/drivers/CdpTimeDriver.ts`, we currently call `await this.client!.send('Runtime.enable')` unconditionally to collect `executionContextIds` (using the `Runtime.executionContextCreated` event) in the `prepare` method.

These execution context IDs are *only* used for `this.multiFrameSyncMediaParams`, which is called during the hot loop (`runSetTime`) to synchronize `<video>` and `<audio>` elements across all iframes via `this.defaultSyncMedia()`.

If a composition does not have any media elements (`this.hasMedia === false` determined around line 161), `this.defaultSyncMedia()` is never called in the hot loop. Therefore, we do not need to collect `executionContextIds` for those compositions, and we can completely avoid calling `Runtime.enable()`.

Disabling `Runtime.enable()` when it's not needed is highly beneficial because enabling the Runtime domain forces Chromium to track and emit events for every execution context creation, console message, and script execution. Bypassing it should reduce IPC and internal Chromium overhead, especially for complex DOM compositions without media elements (which are the majority of animation compositions).

## Benchmark Configuration
- **Composition URL**: `file://.../examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s

## Implementation Spec

### Step 1: Conditionally enable Runtime domain in `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In the `prepare` method, move the `this.client!.on('Runtime.executionContextCreated', ...)` listener and the `this.client!.send('Runtime.enable')` call to *only* execute if `this.hasMedia` is true.

Before:
```typescript
    this.executionContextIds = [];
    this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);

    // Initialize virtual time policy to 'pause' to take control of the clock.
    // We set initialVirtualTime to Jan 1, 2024 (UTC) to ensure deterministic Date.now()
    const INITIAL_VIRTUAL_TIME = 1704067200; // 2024-01-01T00:00:00Z in seconds
    await this.client!.send('Emulation.setVirtualTimePolicy', {
      policy: 'pause',
      initialVirtualTime: INITIAL_VIRTUAL_TIME
    });
```
...
```typescript
    // Enable Runtime so we actually receive executionContextCreated events
    // Catch errors in case another driver instance sharing this session already enabled it.
    await this.client!.send('Runtime.enable').catch(() => {});

    this.currentTime = 0;
```

After (move event listener registration to where we check hasMedia, and conditionalize Runtime.enable):
```typescript
    this.executionContextIds = [];
    // Only listen to execution context creation if we actually need it for media syncing
    // (We will attach it later if hasMedia is true)

    // Initialize virtual time policy to 'pause' to take control of the clock.
    // We set initialVirtualTime to Jan 1, 2024 (UTC) to ensure deterministic Date.now()
    const INITIAL_VIRTUAL_TIME = 1704067200; // 2024-01-01T00:00:00Z in seconds
    await this.client!.send('Emulation.setVirtualTimePolicy', {
      policy: 'pause',
      initialVirtualTime: INITIAL_VIRTUAL_TIME
    });
```
...
```typescript
    if (this.hasMedia) {
      this.client!.on('Runtime.executionContextCreated', this.handleExecutionContextCreated);
      // Enable Runtime so we actually receive executionContextCreated events
      // Catch errors in case another driver instance sharing this session already enabled it.
      await this.client!.send('Runtime.enable').catch(() => {});
    }

    this.currentTime = 0;
```

**Why**: By only enabling the `Runtime` domain when `hasMedia` is true, we prevent Chromium from having to emit `Runtime.executionContextCreated` and other associated events for standard DOM renders. This reduces CDP chatter and slightly lowers the per-frame overhead.
**Risk**: If we somehow need `Runtime.enable` for something else later, we'd have to re-enable it. Currently, the `CdpTimeDriver` only uses it to collect context IDs for `multiFrameSyncMediaParams`.

## Variations

### Variation A: Completely eliminate `Runtime.enable` and `executionContextIds`
If we can run `window.__helios_sync_media()` without tracking `executionContextIds`, we could completely remove `Runtime.enable`. However, multi-frame sync requires knowing all frame execution contexts, so conditional enabling is the safest approach that retains full correctness for compositions with media.

## Canvas Smoke Test
Run the standard canvas benchmark (`packages/renderer/scripts/benchmark-perf.ts`) to ensure the changes don't break canvas rendering. The canvas renderer doesn't rely on `CdpTimeDriver` (it uses `CaptureLoop` and `CanvasStrategy`), but we should verify the system remains stable.

## Correctness Check
Run the `dom-benchmark.mp4` output check. Ensure the video renders properly with the expected number of frames and the animation looks visually identical.

## Results Summary
- **Best render time**: 3.269s
- **Result**: discard
