---
id: PERF-570
slug: remove-begin-frame-interval
status: complete
claimed_by: "executor-session"
created: 2024-06-14
completed: "2024-06-14"
result: "no-improvement"
---

# PERF-570: Remove interval from beginFrameParams

## Focus Area
`DomStrategy.ts` hot loop (`capture`).

## Background Research
Currently, `DomStrategy` explicitly sets the `interval` property on `beginFrameParams` and `targetBeginFrameParams` to `this.frameInterval` (which is `1000 / fps`).
Since `CdpTimeDriver.ts` rigidly controls the virtual time advancement (using `setVirtualTimePolicy` and providing explicit virtual time budgets via `delta * 1000`), the `interval` parameter passed to `HeadlessExperimental.beginFrame` is largely redundant and potentially conflicts or forces Chromium to perform unnecessary internal state synchronizations or arithmetic for an interval that we already deterministically advanced. Removing it reduces IPC payload size and relies entirely on our manual virtual time budget advancement.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.511s
- **Bottleneck analysis**: The Playwright CDP IPC serialization and Chromium compositor synchronization.

## Implementation Spec

### Step 1: Remove `interval` from `beginFrameParams`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove `interval: 0` from the `beginFrameParams` initialization.
2. Remove `this.beginFrameParams.interval = this.frameInterval;` inside `prepare()`.
3. Remove `interval: this.frameInterval` from `this.targetBeginFrameParams` initialization inside `prepare()`.

**Why**: Rely entirely on `CdpTimeDriver`'s virtual time advancement. This shrinks the IPC payload and removes redundant information from the `beginFrame` call.
**Risk**: If Chromium requires `interval` to calculate something internal even when time is manually stepped, animations might break.

## Variations
None.

## Canvas Smoke Test
N/A.

## Correctness Check
Run standard DOM render tests to ensure animations progress correctly.

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	1.494	150	100.41	45.0	discard	baseline
2	1.481	150	101.25	42.3	discard	remove interval
3	1.515	150	99.01	42.3	discard	remove interval
```
- **Best render time**: 1.481s (vs baseline 1.494s)
- **Improvement**: ~0.8% (within margin of error)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-570]
