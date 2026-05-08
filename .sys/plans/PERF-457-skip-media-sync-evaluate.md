---
id: PERF-457
slug: skip-media-sync-evaluate
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-457: Skip Media Sync Runtime.evaluate in CdpTimeDriver When No Media Exists via Closure Assignment

## Focus Area
`CdpTimeDriver.ts` media synchronization logic inside the hot loop (`runSetTime`).

## Background Research
Currently, `CdpTimeDriver` executes a fire-and-forget `Runtime.evaluate` call on every frame to invoke `window.__helios_sync_media` to keep HTML5 video/audio elements in sync with the Chromium virtual time.

While PERF-448 previously attempted to optimize this by introducing a `hasMedia` state flag, it failed because the overhead of checking the branch condition inside the hot loop offset the gains of skipping the CDP call. Another approach is to completely eliminate the CDP call for compositions without media elements by conditionally assigning the `syncMediaFn` function reference during driver initialization.

If no media elements exist, we can assign a no-op function to the internal media sync handler, completely avoiding the `Runtime.evaluate` overhead over IPC for the vast majority of compositions (which are purely DOM/CSS/Canvas). This builds upon the `CdpTimeDriver` migration (PERF-453) which successfully decoupled virtual time from JS execution.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html` (contains no media elements)
- **Render Settings**: 1280x720, 30fps, 3s duration (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.860s (from current scratchpad)
- **Bottleneck analysis**: IPC overhead from dispatching unnecessary `Runtime.evaluate` calls to the browser for every frame when no media elements need synchronization.

## Implementation Spec

### Step 1: Conditionally define the media sync execution path
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private property `syncMediaFn` to the `CdpTimeDriver` class.
2. During `prepare()`, after `await this.client!.send('Runtime.enable').catch(() => {});`, check if media elements exist on the page using the CDP client (e.g. `const { result } = await this.client!.send('Runtime.evaluate', { expression: "document.querySelectorAll('video, audio').length > 0", returnByValue: true }); const hasMedia = result.value;`).
3. If `hasMedia` is true, assign `this.syncMediaFn = this.defaultSyncMedia;`, where `defaultSyncMedia` is a new private method containing the current logic inside `runSetTime` (the `const frames = this.cachedFrames; ...` block).
4. If `hasMedia` is false, assign `this.syncMediaFn = () => {};` (a no-op).
5. Update `runSetTime` to replace the inline media sync block with `this.syncMediaFn(timeInSeconds);`.

**Why**: This removes the `Runtime.evaluate` IPC call entirely for non-media compositions without adding any conditional branching (`if (hasMedia)`) to the hot loop, maximizing throughput.
**Risk**: If media elements are injected dynamically *after* initialization runs, they won't be synced. However, Helios compositions are deterministic and media elements are present in the initial DOM tree or preloaded, so this risk is minimal for standard workloads.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npx tsx tests/verify-cdp-determinism.ts` to ensure time synchronization is unaffected.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npm run build:examples && npm run build && npx tsx scripts/benchmark-test.js`) to verify the speedup and ensure successful render completion.

## Prior Art
- PERF-448: Failed attempt to optimize this using a boolean branch check.
- PERF-453: Successful migration to CdpTimeDriver.
- PERF-456: A previously authored (but unexecuted) plan exactly matching this approach.
