---
id: PERF-459
slug: skip-media-sync
status: complete
claimed_by: "jules"
created: 2024-06-03
completed: ""
result: "discard"
---

# PERF-459: Bypass Runtime.evaluate in CdpTimeDriver When No Media Exists

## Focus Area
`CdpTimeDriver.ts` inside the hot loop (`runSetTime`).

## Background Research
Currently, `CdpTimeDriver` executes a fire-and-forget `Runtime.evaluate` call on every frame to invoke `window.__helios_sync_media`, regardless of whether there are any media elements on the page. This incurs IPC overhead for purely DOM/Canvas compositions.

Previous experiments to optimize this:
- **PERF-448**: Attempted to use a branch check (`if (this.hasMedia)`) inside the hot loop. This failed because the branch checking overhead offset the gains.
- **PERF-458**: Authored to use a closure assignment approach (`this.syncMediaFn`) but not executed.

We will implement the closure-assignment approach. By conditionally assigning the `syncMediaFn` property once during the driver's initialization, we eliminate the `Runtime.evaluate` IPC overhead on every frame for compositions lacking media, without adding any conditional branches to the hot loop (`runSetTime`).

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html` (contains no media elements)
- **Render Settings**: 1280x720, 30fps, 3s duration (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary `Runtime.evaluate` IPC overhead for non-media compositions.

## Implementation Spec

### Step 1: Conditionally define the media sync execution path
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private property `syncMediaFn` to the `CdpTimeDriver` class, initialized to `() => {}`.
2. Move the media syncing logic inside `runSetTime` into a new private method, `defaultSyncMedia(timeInSeconds: number)`.
3. During `prepare`, check for media elements using the CDP client:
   ```typescript
   const { result } = await this.client!.send('Runtime.evaluate', {
     expression: "document.querySelectorAll('video, audio').length > 0",
     returnByValue: true
   });
   const hasMedia = result.value;
   ```
4. If `hasMedia` is true, assign `this.syncMediaFn = this.defaultSyncMedia.bind(this);`.
5. Update `runSetTime` to simply call `this.syncMediaFn(timeInSeconds);` where the media sync block used to be.

**Why**: Removes the `Runtime.evaluate` call for non-media compositions without adding branch checks to the hot loop.
**Risk**: If media elements are injected *after* initialization, they won't be synced. Since Helios is deterministic and preloads assets, this risk is negligible.

## Variations
None.

## Canvas Smoke Test
Run \`cd packages/renderer && npx tsx tests/verify-cdp-determinism.ts\` to ensure time synchronization remains stable.

## Correctness Check
Run the DOM render benchmark script (\`cd packages/renderer && npm run build:examples && npm run build && npx tsx scripts/benchmark-test.js\`) to verify the speedup and ensure successful render completion.

## Prior Art
- PERF-448: Failed attempt using a boolean branch.
- PERF-458: Proposed plan for closure assignment.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	0.000	0	0.00	0.0	discard	IMPOSSIBLE: DUPLICATION
```
