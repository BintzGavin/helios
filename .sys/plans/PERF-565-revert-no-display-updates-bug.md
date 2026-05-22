---
id: PERF-565
slug: revert-no-display-updates-bug
status: unclaimed
claimed_by: ""
created: 2024-05-22
completed: ""
result: ""
---

# PERF-565: Revert `noDisplayUpdates: true` Bug in `DomStrategy.ts`

## Focus Area
`DomStrategy` in `packages/renderer/src/strategies/DomStrategy.ts` captures DOM screenshots using `HeadlessExperimental.beginFrame`. In PERF-562, `noDisplayUpdates: true` was introduced, aiming to improve performance. However, setting this flag to `true` has been discovered to be a critical bug: it instructs Chromium to skip the actual screenshot generation/display update entirely, leading to a blank or black video output. We need to revert `noDisplayUpdates` to `false` (or remove the flag, which defaults to false) to restore correct rendering functionality.

## Background Research
When `noDisplayUpdates` is `true` in `HeadlessExperimental.beginFrame`, Chromium's headless compositor will execute the begin frame steps (animations, layout) but skip the actual drawing and screenshot data generation, because it assumes the client doesn't need the visual output for this frame. For Helios, we need the visual output of *every* frame to pipe to FFmpeg. Thus, this optimization fundamentally breaks the render output. As established in prior experiments (PERF-561), explicitly setting `noDisplayUpdates: false` is correct and actually optimizes the synchronization path over `true`.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/`
- **Render Settings**: 150 frames, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds (though correctness is the primary goal here)
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A (Current output is bugged/blank)

## Implementation Spec

### Step 1: Revert `noDisplayUpdates` in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. In `beginFrameParams`, change `noDisplayUpdates: true` to `noDisplayUpdates: false`.
2. In `targetBeginFrameParams`, change `noDisplayUpdates: true` to `noDisplayUpdates: false`.
**Why**: Ensures Chromium actually renders and returns the screenshot data for the frame, fixing the critical bug introduced in PERF-562.
**Risk**: Frame generation time will increase slightly compared to the "bugged" state because actual image encoding will occur again, but this is required for correct output.

## Correctness Check
Run `npm run test -w packages/renderer` (or manually render a composition) and visually verify that the output video is no longer blank/black.
