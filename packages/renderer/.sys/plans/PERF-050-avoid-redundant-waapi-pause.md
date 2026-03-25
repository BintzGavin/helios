---
id: PERF-050
slug: avoid-redundant-waapi-pause
status: complete
claimed_by: "executor-session"
created: 2024-05-28
completed: "2026-03-25"
result: improved
---
# PERF-050: Avoid Redundant WAAPI Pause

## Focus Area
DOM Rendering Frame Capture Overhead. This targets the CPU overhead in the frame capture loop in `SeekTimeDriver.ts`. Specifically, avoiding redundant `anim.pause()` calls on Web Animations API (WAAPI) objects that are already paused.

## Background Research
In `packages/renderer/src/drivers/SeekTimeDriver.ts`, `__helios_seek` iterates over all cached scopes and their active animations, unconditionally setting `currentTime` and calling `pause()`. If a document has many animations, this forces Chromium to evaluate state transitions on every frame. Calling `pause()` on every frame is redundant if it's already paused. We can optimize this by checking the `playState` property of the animation.

## Benchmark Configuration
- **Composition URL**: The executor will need to use `ls` or `list_files` on the `examples/` directory during execution to find, build, and verify a valid composition URL for benchmarking.
- **Render Settings**: 600x600, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.161s (from PERF-049)
- **Bottleneck analysis**: Main thread overhead executing `Runtime.evaluate` script `__helios_seek` per frame.

## Implementation Spec

### Step 1: Optimize WAAPI updates in `SeekTimeDriver`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `__helios_seek`, locate the inner loop over the `animations` array where `anim.currentTime` and `anim.pause()` are called. Update this to only call `anim.pause()` if `anim.playState !== 'paused'`.
**Why**: Avoids potential internal V8/Blink microtasks associated with the `pause()` method call when it's a no-op.
**Risk**: Minimal. `playState` is standard WAAPI.

## Variations
None.

## Canvas Smoke Test
Run the Canvas baseline script to ensure basic rendering still works.
`npx tsx packages/renderer/scripts/render.ts`

## Correctness Check
Run the DOM render script and verify output exists, has valid video contents, and does not crash.
`npx tsx packages/renderer/scripts/render-dom.ts`

## Results Summary
- **Best render time**: 32.221s (vs baseline 32.998s)
- **Improvement**: 2.3%
- **Kept experiments**: [PERF-050] Avoid redundant WAAPI pause
- **Discarded experiments**: none
