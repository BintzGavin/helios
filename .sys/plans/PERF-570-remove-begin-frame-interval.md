---
id: PERF-570
slug: remove-begin-frame-interval
status: claimed
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
- **Best render time**: 13.530s (vs baseline 12.413s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-570]
