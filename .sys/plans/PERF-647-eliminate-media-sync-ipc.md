---
id: PERF-647
slug: eliminate-media-sync-ipc
status: unclaimed
claimed_by: ""
created: 2024-06-01
completed: ""
result: ""
---

# PERF-647: Eliminate Media Sync IPC in CdpTimeDriver

## Focus Area
`CdpTimeDriver.ts` (Media Syncing): The `runSetTime` hot loop currently makes a CDP `Runtime.evaluate` call to execute `window.__helios_sync_media()` on every frame if the page has media.

## Background Research
Currently, `CdpTimeDriver` executes a CDP call (`this.client!.send('Runtime.evaluate', ...)`) on every frame before advancing the virtual time budget to synchronize HTML5 media elements. This introduces a significant Playwright IPC roundtrip overhead.
Instead of driving this via CDP on every frame from the Node.js side, we can inject a browser-side loop using `requestAnimationFrame` (or by hooking into the virtual time advance) that automatically syncs the media directly within the browser context. When virtual time advances, the browser event loop runs, which should trigger the internal sync loop without requiring Node to issue an explicit command.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/composition.html`)
- **Render Settings**: Standard microVM
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.202s

## Implementation Spec

### Step 1: Remove CDP `Runtime.evaluate` from `runSetTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the `defaultSyncMedia` invocation from `runSetTime`.
2. Remove the `defaultSyncMedia` method entirely.
3. Remove `singleFrameSyncMediaParams` and `multiFrameSyncMediaParams` initialization and properties.

### Step 2: Inject automatic sync loop in browser
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. In the `initScript` string within the `prepare` method, modify `window.__helios_sync_media` to not just run once, but to loop continuously via `requestAnimationFrame`.
2. Example modification:
   ```javascript
   window.__helios_sync_loop = () => {
     window.__helios_sync_media();
     requestAnimationFrame(window.__helios_sync_loop);
   };
   ```
3. Start the loop via `requestAnimationFrame(window.__helios_sync_loop);` at the end of the `initScript`.

**Why**: By moving the sync logic entirely to the browser side and driving it via the browser's own event loop (which we control via virtual time), we completely eliminate one CDP roundtrip per frame.

**Risk**: If the `requestAnimationFrame` does not fire reliably in sync with the virtual time budget expiration, media may desync. The performance override injected uses `epoch`, which keeps it synced.

## Variations
### Variation A: Override `performance.now` hook
If `requestAnimationFrame` loop is too noisy or skips frames relative to the virtual time, we could potentially just rely on the `virtualTimeBudgetExpired` or tie the media time directly to the `performance.now()` override we already inject.

## Canvas Smoke Test
Canvas path doesn't use `CdpTimeDriver`. No specific smoke test needed beyond the standard render test.

## Correctness Check
Run the DOM benchmark and ensure media playback matches the expected output and does not stall.
